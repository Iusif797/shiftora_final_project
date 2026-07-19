import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { type AuthContext, getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

const router = new Hono<AuthContext>();

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  address: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  timezone: z.string().max(50).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  timezone: z.string().max(50).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

router.get("/my", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  let restaurant = null;
  if (user.restaurantId) {
    restaurant = await prisma.restaurant.findUnique({ where: { id: user.restaurantId } });
  }
  if (!restaurant) {
    restaurant = await prisma.restaurant.findUnique({ where: { ownerId: user.id } });
  }

  return c.json({ data: restaurant });
});

router.post("/", zValidator("json", createSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const { name, address, phone, timezone } = c.req.valid("json");

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { restaurantId: true, employee: { select: { id: true } } },
  });
  if (currentUser?.restaurantId) {
    throw new AppError(409, "This account already belongs to a restaurant", "ALREADY_IN_RESTAURANT");
  }
  if (currentUser?.employee) {
    throw new AppError(
      409,
      "This account has an employee history and cannot create a restaurant",
      "EMPLOYEE_HISTORY_CONFLICT",
    );
  }

  const existing = await prisma.restaurant.findFirst({ where: { ownerId: user.id } });
  if (existing) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "owner", restaurantId: existing.id },
    });
    return c.json({ data: existing });
  }

  const selectedTimezone = timezone || "UTC";
  try {
    Intl.DateTimeFormat(undefined, { timeZone: selectedTimezone });
  } catch {
    throw new AppError(400, "Invalid timezone", "VALIDATION_ERROR");
  }

  const restaurant = await prisma.$transaction(async (tx) => {
    const created = await tx.restaurant.create({
      data: {
        name,
        address: address || null,
        phone: phone || null,
        timezone: selectedTimezone,
        ownerId: user.id,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { role: "owner", restaurantId: created.id },
    });
    await tx.restaurantTable.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        restaurantId: created.id,
        number: index + 1,
        label: `Table ${index + 1}`,
        capacity: 4,
      })),
    });
    return created;
  });

  return c.json({ data: restaurant });
});

router.put("/:id", zValidator("json", updateSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const id = c.req.param("id");
  const body = c.req.valid("json");

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return c.json({ error: { message: "Not found" } }, 404);
  if (restaurant.ownerId !== user.id) return c.json({ error: { message: "Forbidden" } }, 403);

  const nextTimezone = body.timezone ?? restaurant.timezone;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: nextTimezone });
  } catch {
    throw new AppError(400, "Invalid timezone", "VALIDATION_ERROR");
  }
  const nextLatitude = body.latitude !== undefined ? body.latitude : restaurant.latitude;
  const nextLongitude = body.longitude !== undefined ? body.longitude : restaurant.longitude;
  if ((nextLatitude == null) !== (nextLongitude == null)) {
    throw new AppError(400, "Latitude and longitude must be set together", "VALIDATION_ERROR");
  }

  const updated = await prisma.restaurant.update({
    where: { id },
    data: {
      name: body.name ?? restaurant.name,
      address: body.address !== undefined ? body.address : restaurant.address,
      phone: body.phone !== undefined ? body.phone : restaurant.phone,
      timezone: nextTimezone,
      latitude: nextLatitude,
      longitude: nextLongitude,
      taxRate: body.taxRate ?? restaurant.taxRate,
    },
  });

  return c.json({ data: updated });
});

export { router as restaurantRouter };
