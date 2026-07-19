import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { generateShifts } from "../services/shift-generator";
import { sendPushNotification } from "../services/notifications";
import { type AuthContext, assertRestaurantAccess, getAuthUser } from "../middleware/auth";
import { logger } from "../lib/logger";
import { assertFeature, assertShiftLimit } from "../middleware/subscription";
import { issueCheckinToken } from "../lib/checkin-token";

const router = new Hono<AuthContext>();

const createShiftSchema = z.object({
  title: z.string().trim().min(1, "title required").max(120),
  startTime: z.string().min(1, "startTime required"),
  endTime: z.string().min(1, "endTime required"),
  notes: z.string().max(1_000).optional(),
  maxEmployees: z.coerce.number().int().positive().max(500).optional(),
});

const updateShiftSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().max(1_000).optional(),
  maxEmployees: z.coerce.number().int().positive().max(500).optional(),
});

const assignSchema = z.object({
  employeeId: z.string().min(1, "employeeId required"),
});

const generateSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

router.get("/upcoming", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!employee) return c.json({ data: [] });

  const now = new Date();
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId: employee.id,
      shift: { endTime: { gte: now }, status: { in: ["SCHEDULED", "ACTIVE"] } },
      status: { in: ["ASSIGNED", "CONFIRMED"] },
    },
    include: { shift: true },
    orderBy: { shift: { startTime: "asc" } },
    take: 10,
  });

  return c.json({ data: assignments });
});

router.get("/my", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!employee) return c.json({ data: [] });

  const assignments = await prisma.shiftAssignment.findMany({
    where: { employeeId: employee.id },
    include: {
      shift: true,
      checkins: { orderBy: { checkinTime: "desc" }, take: 1 },
    },
    orderBy: { shift: { startTime: "desc" } },
  });

  return c.json({ data: assignments });
});

router.get("/:id/checkin-tokens", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }

  const shift = await prisma.shift.findUnique({
    where: { id: c.req.param("id") },
    include: {
      assignments: {
        where: { status: { in: ["ASSIGNED", "CONFIRMED"] } },
        include: { employee: { include: { user: { select: { name: true } } } } },
      },
    },
  });
  if (!shift) return c.json({ error: { message: "Shift not found" } }, 404);
  assertRestaurantAccess(user, shift.restaurantId);
  if (!["SCHEDULED", "ACTIVE"].includes(shift.status)) {
    return c.json(
      { error: { message: "QR codes are unavailable for this shift", code: "INVALID_SHIFT_STATE" } },
      409,
    );
  }

  const now = Date.now();
  return c.json({
    data: shift.assignments.map((assignment) => {
      const issued = issueCheckinToken(assignment.id, now);
      return {
        assignmentId: assignment.id,
        employeeName: assignment.employee.user.name,
        token: issued.token,
        expiresAt: issued.expiresAt,
      };
    }),
  });
});

router.get("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }
  if (!user.restaurantId) return c.json({ data: [] });

  const status = c.req.query("status") as "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | undefined;
  const shifts = await prisma.shift.findMany({
    where: {
      restaurantId: user.restaurantId,
      ...(status ? { status } : {}),
    },
    include: {
      assignments: {
        include: {
          employee: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return c.json({ data: shifts });
});

router.post("/generate", zValidator("json", generateSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }
  if (!user.restaurantId) return c.json({ error: { message: "No restaurant" } }, 400);

  await assertFeature(user.restaurantId, "aiShiftGeneration");

  const body = c.req.valid("json");
  const startDate = body.startDate ? new Date(body.startDate) : undefined;
  const endDate = body.endDate ? new Date(body.endDate) : undefined;

  const { created } = await generateShifts({
    restaurantId: user.restaurantId,
    userId: user.id,
    startDate,
    endDate,
  });

  return c.json({ data: { created: created.length, shifts: created } });
});

router.post("/", zValidator("json", createShiftSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }
  if (!user.restaurantId) return c.json({ error: { message: "No restaurant" } }, 400);

  await assertShiftLimit(user.restaurantId);

  const { title, startTime, endTime, notes, maxEmployees } = c.req.valid("json");
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return c.json(
      { error: { message: "Shift end must be after its start", code: "VALIDATION_ERROR" } },
      400,
    );
  }

  const shift = await prisma.shift.create({
    data: {
      restaurantId: user.restaurantId,
      title,
      startTime: start,
      endTime: end,
      notes: notes ?? null,
      maxEmployees: maxEmployees ? Number(maxEmployees) : null,
      createdById: user.id,
    },
  });

  return c.json({ data: shift });
});

router.put("/:id", zValidator("json", updateShiftSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const id = c.req.param("id");

  const existing = await prisma.shift.findUnique({ where: { id } });
  if (!existing) return c.json({ error: { message: "Not found" } }, 404);
  assertRestaurantAccess(user, existing.restaurantId);

  const body = c.req.valid("json");
  const { title, startTime, endTime, status, notes, maxEmployees } = body;
  const nextStart = startTime ? new Date(startTime) : existing.startTime;
  const nextEnd = endTime ? new Date(endTime) : existing.endTime;
  if (
    Number.isNaN(nextStart.getTime()) ||
    Number.isNaN(nextEnd.getTime()) ||
    nextEnd <= nextStart
  ) {
    return c.json(
      { error: { message: "Shift end must be after its start", code: "VALIDATION_ERROR" } },
      400,
    );
  }

  const shift = await prisma.shift.update({
    where: { id },
    data: {
      title: title ?? undefined,
      startTime: startTime ? nextStart : undefined,
      endTime: endTime ? nextEnd : undefined,
      status: status ?? undefined,
      notes: notes ?? undefined,
      maxEmployees: maxEmployees !== undefined ? Number(maxEmployees) : undefined,
    },
  });

  return c.json({ data: shift });
});

router.delete("/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const id = c.req.param("id");

  const existing = await prisma.shift.findUnique({
    where: { id },
    include: { assignments: { include: { employee: { include: { user: { select: { pushToken: true } } } } } } },
  });
  if (!existing) return c.json({ error: { message: "Not found" } }, 404);
  assertRestaurantAccess(user, existing.restaurantId);

  await prisma.shift.update({ where: { id }, data: { status: "CANCELLED" } });

  for (const a of existing.assignments) {
    const token = a.employee?.user?.pushToken;
    if (token) {
      sendPushNotification(
        token,
        "Shift cancelled",
        `${existing.title} has been cancelled`
      ).catch((err: unknown) => {
        logger.error({ err }, "[Push] cancel notification failed");
      });
    }
  }

  return c.json({ data: { success: true } });
});

router.post("/:id/assign", zValidator("json", assignSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const shiftId = c.req.param("id");

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return c.json({ error: { message: "Shift not found" } }, 404);
  assertRestaurantAccess(user, shift.restaurantId);

  const { employeeId } = c.req.valid("json");
  if (shift.status === "CANCELLED" || shift.status === "COMPLETED") {
    return c.json(
      { error: { message: "Cannot assign staff to this shift", code: "INVALID_SHIFT_STATE" } },
      409,
    );
  }

  // Сотрудник обязан принадлежать тому же ресторану, что и смена — иначе
  // менеджер ресторана A мог бы назначить чужого сотрудника из ресторана B.
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.restaurantId !== shift.restaurantId || !employee.isActive) {
    return c.json(
      { error: { message: "Employee not in this restaurant", code: "INVALID_EMPLOYEE" } },
      400,
    );
  }

  if (shift.maxEmployees != null) {
    const assignedCount = await prisma.shiftAssignment.count({
      where: { shiftId, status: { notIn: ["CANCELLED", "DECLINED"] } },
    });
    if (assignedCount >= shift.maxEmployees) {
      return c.json(
        { error: { message: "Shift staffing limit reached", code: "SHIFT_FULL" } },
        409,
      );
    }
  }

  const assignment = await prisma.shiftAssignment.upsert({
    where: { shiftId_employeeId: { shiftId, employeeId } },
    update: { status: "ASSIGNED" },
    create: { shiftId, employeeId },
    include: {
      employee: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, role: true, restaurantId: true } },
        },
      },
      shift: true,
    },
  });

  const emp = await prisma.employee.findUnique({
    where: { id: assignment.employeeId },
    include: { user: { select: { pushToken: true } } },
  });
  const pushToken = emp?.user?.pushToken;
  if (pushToken && assignment.shift) {
    sendPushNotification(
      pushToken,
      "New shift assigned",
      `${assignment.shift.title} · ${assignment.shift.startTime.toLocaleString()}`
    ).catch((err: unknown) => {
      logger.error({ err }, "[Push] assign notification failed");
    });
  }

  return c.json({ data: assignment });
});

export { router as shiftRouter };
