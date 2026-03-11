import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { type AuthContext, getAuthUser } from "../middleware/auth";

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

  const existing = await prisma.restaurant.findFirst({ where: { ownerId: user.id } });
  if (existing) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "owner", restaurantId: existing.id },
    });
    return c.json({ data: existing });
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      name,
      address: address || null,
      phone: phone || null,
      timezone: timezone || "UTC",
      ownerId: user.id,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "owner", restaurantId: restaurant.id },
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

  const updated = await prisma.restaurant.update({
    where: { id },
    data: {
      name: body.name ?? restaurant.name,
      address: body.address !== undefined ? body.address : restaurant.address,
      phone: body.phone !== undefined ? body.phone : restaurant.phone,
      timezone: body.timezone ?? restaurant.timezone,
    },
  });

  return c.json({ data: updated });
});

export { router as restaurantRouter };
