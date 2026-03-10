import { Hono } from "hono";
import { prisma } from "../prisma";
import { type AuthContext, getAuthUser } from "../middleware/auth";

const router = new Hono<AuthContext>();

router.post("/checkin", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const body = await c.req.json();
  const { shiftAssignmentId, notes, latitude, longitude, photoUrl, qrPayload } = body;

  if (!shiftAssignmentId) return c.json({ error: { message: "shiftAssignmentId required" } }, 400);

  const assignment = await prisma.shiftAssignment.findUnique({
    where: { id: shiftAssignmentId },
    include: { shift: true, employee: true },
  });

  if (!assignment) return c.json({ error: { message: "Assignment not found" } }, 404);

  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
  });
  if (!employee || employee.id !== assignment.employeeId) {
    return c.json({ error: { message: "Not assigned to this shift" } }, 403);
  }

  const existingCheckin = await prisma.checkin.findFirst({
    where: { shiftAssignmentId, checkoutTime: null },
  });
  if (existingCheckin) return c.json({ data: existingCheckin });

  const checkin = await prisma.checkin.create({
    data: {
      shiftAssignmentId,
      employeeId: assignment.employeeId,
      restaurantId: assignment.shift.restaurantId,
      checkinTime: new Date(),
      notes: notes ?? null,
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      photoUrl: photoUrl ?? null,
      qrPayload: qrPayload ?? null,
    },
  });

  await prisma.shiftAssignment.update({
    where: { id: shiftAssignmentId },
    data: { status: "CONFIRMED" },
  });

  const lateThresholdMs = 15 * 60 * 1000;
  const shiftStart = new Date(assignment.shift.startTime);
  const checkinTime = new Date(checkin.checkinTime);
  if (checkinTime.getTime() - shiftStart.getTime() > lateThresholdMs) {
    await prisma.anomaly.create({
      data: {
        shiftAssignmentId,
        employeeId: assignment.employeeId,
        restaurantId: assignment.shift.restaurantId,
        type: "LATE_ARRIVAL",
        severity: "MEDIUM",
      },
    });
  }

  return c.json({ data: checkin });
});

router.post("/checkout", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const body = await c.req.json();
  const { checkinId, notes } = body;

  if (!checkinId) return c.json({ error: { message: "checkinId required" } }, 400);

  const checkin = await prisma.checkin.findUnique({ where: { id: checkinId } });
  if (!checkin) return c.json({ error: { message: "Checkin not found" } }, 404);
  if (checkin.checkoutTime) return c.json({ error: { message: "Already checked out" } }, 400);

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!employee || employee.id !== checkin.employeeId) {
    return c.json({ error: { message: "Not your checkin" } }, 403);
  }

  const updated = await prisma.checkin.update({
    where: { id: checkinId },
    data: {
      checkoutTime: new Date(),
      notes: notes ?? checkin.notes,
    },
  });

  await prisma.shiftAssignment.update({
    where: { id: checkin.shiftAssignmentId },
    data: { status: "COMPLETED" },
  });

  return c.json({ data: updated });
});

router.get("/active", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!employee) return c.json({ data: null });

  const checkin = await prisma.checkin.findFirst({
    where: { employeeId: employee.id, checkoutTime: null },
    include: {
      shiftAssignment: { include: { shift: true } },
    },
    orderBy: { checkinTime: "desc" },
  });

  return c.json({ data: checkin });
});

router.get("/history", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!employee) return c.json({ data: [] });

  const checkins = await prisma.checkin.findMany({
    where: { employeeId: employee.id },
    include: {
      shiftAssignment: { include: { shift: true } },
    },
    orderBy: { checkinTime: "desc" },
    take: 50,
  });

  return c.json({ data: checkins });
});

export { router as checkinRouter };
