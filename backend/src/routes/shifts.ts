import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { generateShifts } from "../services/shift-generator";
import { sendPushNotification } from "../services/notifications";
import { type AuthContext, assertRestaurantAccess, getAuthUser } from "../middleware/auth";

const router = new Hono<AuthContext>();

const createShiftSchema = z.object({
  title: z.string().min(1, "title required"),
  startTime: z.string().min(1, "startTime required"),
  endTime: z.string().min(1, "endTime required"),
  notes: z.string().optional(),
  maxEmployees: z.coerce.number().optional(),
});

const updateShiftSchema = z.object({
  title: z.string().min(1).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
  maxEmployees: z.coerce.number().optional(),
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
      shift: { startTime: { gte: now }, status: { in: ["SCHEDULED", "ACTIVE"] } },
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

router.get("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!user.restaurantId) return c.json({ data: [] });

  const status = c.req.query("status") as "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | undefined;
  const shifts = await prisma.shift.findMany({
    where: {
      restaurantId: user.restaurantId,
      ...(status ? { status } : {}),
    },
    include: {
      assignments: {
        include: { employee: { include: { user: true } } },
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

  const { title, startTime, endTime, notes, maxEmployees } = c.req.valid("json");

  const shift = await prisma.shift.create({
    data: {
      restaurantId: user.restaurantId,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
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

  const shift = await prisma.shift.update({
    where: { id },
    data: {
      title: title ?? undefined,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
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
      ).catch(() => {});
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

  const existing = await prisma.shiftAssignment.findFirst({
    where: { shiftId, employeeId },
  });

  if (existing) {
    return c.json({ data: existing });
  }

  const assignment = await prisma.shiftAssignment.create({
    data: { shiftId, employeeId },
    include: { employee: { include: { user: true } }, shift: true },
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
    ).catch(() => {});
  }

  return c.json({ data: assignment });
});

export { router as shiftRouter };
