import { Hono } from "hono";
import { prisma } from "../prisma";
import { type AuthContext, getAuthUser } from "../middleware/auth";

const router = new Hono<AuthContext>();

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

router.post("/generate", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }
  if (!user.restaurantId) return c.json({ error: { message: "No restaurant" } }, 400);

  const body = await c.req.json().catch(() => ({}));
  const startDate = body.startDate
    ? new Date(body.startDate)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + ((7 - d.getDay()) % 7) || 7);
        d.setHours(0, 0, 0, 0);
        return d;
      })();
  const endDate = body.endDate ? new Date(body.endDate) : new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);

  const [employees, existingShifts, historicalCheckins] = await Promise.all([
    prisma.employee.findMany({
      where: { restaurantId: user.restaurantId, isActive: true },
      include: { user: true },
    }),
    prisma.shift.findMany({
      where: {
        restaurantId: user.restaurantId,
        startTime: { gte: startDate, lte: endDate },
        status: { in: ["SCHEDULED", "ACTIVE"] },
      },
      include: { assignments: true },
    }),
    prisma.checkin.findMany({
      where: {
        restaurantId: user.restaurantId,
        checkinTime: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
        checkoutTime: { not: null },
      },
      include: { shiftAssignment: { include: { shift: true } } },
    }),
  ]);

  const slotDurationHours = 3;
  const countByDateSlot: Record<string, number> = {};
  for (const ck of historicalCheckins) {
    const start = new Date(ck.checkinTime);
    const dayOfWeek = start.getDay();
    const hour = Math.floor(start.getHours() / slotDurationHours) * slotDurationHours;
    const dateStr = start.toISOString().slice(0, 10);
    const slotKey = `${dayOfWeek}-${hour}`;
    const key = `${dateStr}|${slotKey}`;
    countByDateSlot[key] = (countByDateSlot[key] ?? 0) + 1;
  }

  const bySlot: Record<string, number[]> = {};
  for (const [key, count] of Object.entries(countByDateSlot)) {
    const slotKey = key.split("|")[1]!;
    if (!bySlot[slotKey]) bySlot[slotKey] = [];
    bySlot[slotKey].push(count);
  }

  const baselineBySlot: Record<string, number> = {};
  for (const [key, arr] of Object.entries(bySlot)) {
    const avg = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    baselineBySlot[key] = Math.max(1, Math.ceil(avg * 1.1));
  }

  const existingBySlot: Record<string, number> = {};
  for (const shift of existingShifts) {
    const start = new Date(shift.startTime);
    const dayOfWeek = start.getDay();
    const hour = Math.floor(start.getHours() / slotDurationHours) * slotDurationHours;
    const dateStr = start.toISOString().slice(0, 10);
    const slotKey = `${dayOfWeek}-${hour}`;
    const key = `${dateStr}|${slotKey}`;
    existingBySlot[key] = (existingBySlot[key] ?? 0) + shift.assignments.length;
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const created: { shift: unknown; assignments: unknown[] }[] = [];
  const employeeUsage: Record<string, number> = {};

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().slice(0, 10);
    for (let h = 9; h < 22; h += slotDurationHours) {
      const slotKey = `${dayOfWeek}-${h}`;
      const needed = baselineBySlot[slotKey] ?? 2;
      const key = `${dateStr}|${slotKey}`;
      const existing = existingBySlot[key] ?? 0;
      const shortage = Math.max(0, needed - existing);
      if (shortage === 0) continue;

      const slotStart = new Date(d);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(h + slotDurationHours, 0, 0, 0);

      const shift = await prisma.shift.create({
        data: {
          restaurantId: user.restaurantId,
          title: `${dayNames[dayOfWeek]} ${h}:00`,
          startTime: slotStart,
          endTime: slotEnd,
          status: "SCHEDULED",
          createdById: user.id,
        },
      });

      const sorted = [...employees].sort(
        (a, b) => (employeeUsage[a.id] ?? 0) - (employeeUsage[b.id] ?? 0)
      );
      const toAssign = sorted.slice(0, shortage);
      const assignments: unknown[] = [];

      for (const emp of toAssign) {
        const a = await prisma.shiftAssignment.create({
          data: { shiftId: shift.id, employeeId: emp.id },
          include: { employee: { include: { user: true } } },
        });
        assignments.push(a);
        employeeUsage[emp.id] = (employeeUsage[emp.id] ?? 0) + 1;
      }

      created.push({ shift, assignments });
    }
  }

  return c.json({ data: { created: created.length, shifts: created } });
});

router.post("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }
  if (!user.restaurantId) return c.json({ error: { message: "No restaurant" } }, 400);

  const body = await c.req.json();
  const { title, startTime, endTime, notes, maxEmployees } = body;

  if (!title || !startTime || !endTime) {
    return c.json({ error: { message: "title, startTime, endTime are required" } }, 400);
  }

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

router.put("/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const id = c.req.param("id");

  const existing = await prisma.shift.findUnique({ where: { id } });
  if (!existing) return c.json({ error: { message: "Not found" } }, 404);
  if (existing.restaurantId !== user.restaurantId) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const body = await c.req.json();
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

  const existing = await prisma.shift.findUnique({ where: { id } });
  if (!existing) return c.json({ error: { message: "Not found" } }, 404);
  if (existing.restaurantId !== user.restaurantId) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  await prisma.shift.update({ where: { id }, data: { status: "CANCELLED" } });

  return c.json({ data: { success: true } });
});

router.post("/:id/assign", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const shiftId = c.req.param("id");

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return c.json({ error: { message: "Shift not found" } }, 404);
  if (shift.restaurantId !== user.restaurantId) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const body = await c.req.json();
  const { employeeId } = body;

  if (!employeeId) return c.json({ error: { message: "employeeId required" } }, 400);

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

  return c.json({ data: assignment });
});

export { router as shiftRouter };
