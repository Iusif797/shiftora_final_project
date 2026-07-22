import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { sendPushNotification } from "../services/notifications";
import { type AuthContext, getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";
import { verifyCheckinToken } from "../lib/checkin-token";
import {
  resolveCheckinEventTime,
  resolveCheckoutEventTime,
} from "../lib/checkin-event-time";

const router = new Hono<AuthContext>();

const GEOFENCE_RADIUS_M = 500;

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

const checkinSchema = z.object({
  shiftAssignmentId: z.string().min(1, "shiftAssignmentId required"),
  notes: z.string().max(500).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  photoUrl: z.string().url().max(2_000).optional(),
  qrPayload: z.string().max(1_000).optional(),
  clientTimestamp: z.string().datetime().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

const checkoutSchema = z.object({
  checkinId: z.string().min(1, "checkinId required"),
  notes: z.string().optional(),
  clientTimestamp: z.string().datetime().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

router.post("/checkin", zValidator("json", checkinSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const body = c.req.valid("json");
  const {
    shiftAssignmentId,
    notes,
    latitude,
    longitude,
    photoUrl,
    qrPayload,
    clientTimestamp,
    idempotencyKey,
  } = body;

  if (idempotencyKey) {
    const prior = await prisma.checkin.findUnique({ where: { idempotencyKey } });
    if (prior) {
      const owner = await prisma.employee.findUnique({ where: { userId: user.id } });
      if (!owner || owner.id !== prior.employeeId) {
        return c.json({ error: { message: "Idempotency key conflict", code: "IDEMPOTENCY_CONFLICT" } }, 409);
      }
      return c.json({ data: prior });
    }
  }

  const assignment = await prisma.shiftAssignment.findUnique({
    where: { id: shiftAssignmentId },
    include: { shift: true, employee: true },
  });

  if (!assignment) return c.json({ error: { message: "Assignment not found" } }, 404);

  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
  });
  if (!employee || !employee.isActive || employee.id !== assignment.employeeId) {
    return c.json({ error: { message: "Not assigned to this shift" } }, 403);
  }

  if (!["ASSIGNED", "CONFIRMED"].includes(assignment.status)) {
    return c.json(
      { error: { message: "This assignment cannot be checked in", code: "INVALID_ASSIGNMENT_STATE" } },
      409,
    );
  }
  if (!["SCHEDULED", "ACTIVE"].includes(assignment.shift.status)) {
    return c.json(
      { error: { message: "This shift is not open for check-in", code: "INVALID_SHIFT_STATE" } },
      409,
    );
  }

  const resolved = resolveCheckinEventTime({
    clientTimestamp,
    shiftStart: assignment.shift.startTime,
    shiftEnd: assignment.shift.endTime,
  });
  if (!resolved.ok) {
    return c.json({ error: { message: resolved.message, code: resolved.code } }, 409);
  }
  const eventTime = resolved.eventTime;

  if (qrPayload) {
    const verified = verifyCheckinToken(qrPayload);
    if (!verified || verified.assignmentId !== shiftAssignmentId) {
      return c.json(
        { error: { message: "Invalid or expired check-in QR", code: "INVALID_QR" } },
        403,
      );
    }
  }

  if (photoUrl) {
    const asset = await prisma.asset.findFirst({
      where: { userId: user.id, url: photoUrl },
      select: { id: true },
    });
    if (!asset) {
      return c.json(
        { error: { message: "Photo does not belong to this account", code: "INVALID_PHOTO" } },
        400,
      );
    }
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: assignment.shift.restaurantId },
    select: { latitude: true, longitude: true },
  });
  if (restaurant?.latitude != null && restaurant?.longitude != null) {
    if (latitude == null || longitude == null) {
      return c.json(
        { error: { message: "Location is required for check-in", code: "LOCATION_REQUIRED" } },
        400,
      );
    }
    const distance = haversineMeters(
      latitude,
      longitude,
      restaurant.latitude,
      restaurant.longitude,
    );
    if (distance > GEOFENCE_RADIUS_M) {
      return c.json(
        {
          error: {
            message: "You are too far from the restaurant to check in",
            code: "OUTSIDE_GEOFENCE",
          },
        },
        403,
      );
    }
  }

  const existingCheckin = await prisma.checkin.findUnique({
    where: { shiftAssignmentId },
  });
  if (existingCheckin) {
    if (!existingCheckin.checkoutTime) return c.json({ data: existingCheckin });
    return c.json(
      { error: { message: "This assignment was already completed", code: "ALREADY_CHECKED_IN" } },
      409,
    );
  }

  let checkin;
  try {
    checkin = await prisma.$transaction(async (tx) => {
      const created = await tx.checkin.create({
        data: {
          shiftAssignmentId,
          employeeId: assignment.employeeId,
          restaurantId: assignment.shift.restaurantId,
          checkinTime: eventTime,
          notes: notes ?? null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          photoUrl: photoUrl ?? null,
          qrPayload: qrPayload ?? null,
          idempotencyKey: idempotencyKey ?? null,
        },
      });
      await tx.shiftAssignment.update({
        where: { id: shiftAssignmentId },
        data: { status: "CONFIRMED" },
      });
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (idempotencyKey) {
        const byKey = await prisma.checkin.findUnique({ where: { idempotencyKey } });
        if (byKey) return c.json({ data: byKey });
      }
      const duplicate = await prisma.checkin.findUnique({ where: { shiftAssignmentId } });
      if (duplicate && !duplicate.checkoutTime) return c.json({ data: duplicate });
      return c.json(
        { error: { message: "This assignment was already checked in", code: "ALREADY_CHECKED_IN" } },
        409,
      );
    }
    throw error;
  }

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

  const { checkinId, notes, clientTimestamp, idempotencyKey } = c.req.valid("json");

  if (idempotencyKey) {
    const prior = await prisma.checkin.findUnique({ where: { checkoutIdempotencyKey: idempotencyKey } });
    if (prior) {
      const owner = await prisma.employee.findUnique({ where: { userId: user.id } });
      if (!owner || owner.id !== prior.employeeId) {
        return c.json({ error: { message: "Idempotency key conflict", code: "IDEMPOTENCY_CONFLICT" } }, 409);
      }
      return c.json({ data: prior });
    }
  }

  const checkin = await prisma.checkin.findUnique({ where: { id: checkinId } });
  if (!checkin) return c.json({ error: { message: "Checkin not found" } }, 404);
  if (checkin.checkoutTime) return c.json({ data: checkin });

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!employee || employee.id !== checkin.employeeId) {
    return c.json({ error: { message: "Not your checkin" } }, 403);
  }

  const resolved = resolveCheckoutEventTime({
    clientTimestamp,
    checkinTime: checkin.checkinTime,
  });
  if (!resolved.ok) {
    return c.json({ error: { message: resolved.message, code: resolved.code } }, 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.checkin.updateMany({
      where: { id: checkinId, checkoutTime: null },
      data: {
        checkoutTime: resolved.eventTime,
        notes: notes ?? checkin.notes,
        checkoutIdempotencyKey: idempotencyKey ?? null,
      },
    });
    if (claimed.count !== 1) {
      const current = await tx.checkin.findUniqueOrThrow({ where: { id: checkinId } });
      if (current.checkoutTime) return current;
      throw new AppError(409, "Already checked out", "ALREADY_CHECKED_OUT");
    }
    await tx.shiftAssignment.update({
      where: { id: checkin.shiftAssignmentId },
      data: { status: "COMPLETED" },
    });
    return tx.checkin.findUniqueOrThrow({ where: { id: checkinId } });
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
