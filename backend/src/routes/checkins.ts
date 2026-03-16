import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { sendPushNotification } from "../services/notifications";
import { type AuthContext, getAuthUser } from "../middleware/auth";

const router = new Hono<AuthContext>();

const checkinSchema = z.object({
  shiftAssignmentId: z.string().min(1, "shiftAssignmentId required"),
  notes: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  photoUrl: z.string().optional(),
  qrPayload: z.string().optional(),
});

const checkoutSchema = z.object({
  checkinId: z.string().min(1, "checkinId required"),
  notes: z.string().optional(),
});

router.post("/checkin", zValidator("json", checkinSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const body = c.req.valid("json");
  const { shiftAssignmentId, notes, latitude, longitude, photoUrl, qrPayload } = body;

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
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      photoUrl: (photoUrl && photoUrl !== "" ? photoUrl : null) ?? null,
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

    const empUser = await prisma.user.findUnique({
      where: { id: assignment.employee.userId },
      select: { pushToken: true },
    });
    if (empUser?.pushToken) {
      sendPushNotification(
        empUser.pushToken,
        "Late arrival recorded",
        "Your check-in was marked as late. Please ensure you arrive on time for future shifts."
      ).catch(() => {});
    }
  }

  return c.json({ data: checkin });
});

router.post("/checkout", zValidator("json", checkoutSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const { checkinId, notes } = c.req.valid("json");

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
  if (!employee) return c.json({ data: { items: [], total: 0, page: 1, totalPages: 0 } });

  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 20));
  const skip = (page - 1) * limit;

  const [checkins, total] = await Promise.all([
    prisma.checkin.findMany({
      where: { employeeId: employee.id },
      include: {
        shiftAssignment: { include: { shift: true } },
      },
      orderBy: { checkinTime: "desc" },
      skip,
      take: limit,
    }),
    prisma.checkin.count({ where: { employeeId: employee.id } }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return c.json({ data: { items: checkins, total, page, totalPages } });
});

export { router as checkinRouter };
