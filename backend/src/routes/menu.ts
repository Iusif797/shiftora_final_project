import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { type AuthContext, assertRestaurantAccess, getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

const router = new Hono<AuthContext>();

const categorySchema = z.object({
  name: z.string().min(1).max(80),
  sortOrder: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

const itemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  price: z.coerce.number().positive(),
  photoUrl: z.string().max(2000).optional().nullable(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.coerce.number().optional(),
});

function requireStaff(user: ReturnType<typeof getAuthUser>) {
  if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  if (!user.restaurantId) throw new AppError(400, "No restaurant", "NO_RESTAURANT");
  return user;
}

function requireManager(user: ReturnType<typeof getAuthUser>) {
  const staff = requireStaff(user);
  if (!["owner", "manager"].includes(staff.role)) {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }
  return staff;
}

router.get("/categories", async (c) => {
  const user = requireStaff(getAuthUser(c));
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: user.restaurantId!, isActive: true },
    include: { items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return c.json({ data: categories });
});

router.post("/categories", zValidator("json", categorySchema), async (c) => {
  const user = requireManager(getAuthUser(c));
  const body = c.req.valid("json");
  const category = await prisma.menuCategory.create({
    data: {
      restaurantId: user.restaurantId!,
      name: body.name,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    },
  });
  return c.json({ data: category });
});

router.put("/categories/:id", zValidator("json", categorySchema.partial()), async (c) => {
  const user = requireManager(getAuthUser(c));
  const id = c.req.param("id");
  const existing = await prisma.menuCategory.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Not found", "NOT_FOUND");
  assertRestaurantAccess(user, existing.restaurantId);
  const body = c.req.valid("json");
  const category = await prisma.menuCategory.update({ where: { id }, data: body });
  return c.json({ data: category });
});

router.delete("/categories/:id", async (c) => {
  const user = requireManager(getAuthUser(c));
  const id = c.req.param("id");
  const existing = await prisma.menuCategory.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Not found", "NOT_FOUND");
  assertRestaurantAccess(user, existing.restaurantId);
  await prisma.menuCategory.update({ where: { id }, data: { isActive: false } });
  return c.json({ data: { success: true } });
});

router.get("/items", async (c) => {
  const user = requireStaff(getAuthUser(c));
  const categoryId = c.req.query("categoryId");
  const items = await prisma.menuItem.findMany({
    where: {
      restaurantId: user.restaurantId!,
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return c.json({ data: items });
});

router.post("/items", zValidator("json", itemSchema), async (c) => {
  const user = requireManager(getAuthUser(c));
  const body = c.req.valid("json");
  const category = await prisma.menuCategory.findUnique({ where: { id: body.categoryId } });
  if (!category || category.restaurantId !== user.restaurantId) {
    throw new AppError(400, "Invalid category", "INVALID_CATEGORY");
  }
  const item = await prisma.menuItem.create({
    data: {
      restaurantId: user.restaurantId!,
      categoryId: body.categoryId,
      name: body.name,
      description: body.description,
      price: body.price,
      photoUrl: body.photoUrl ?? null,
      isAvailable: body.isAvailable ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  });
  return c.json({ data: item });
});

router.put("/items/:id", zValidator("json", itemSchema.partial()), async (c) => {
  const user = requireManager(getAuthUser(c));
  const id = c.req.param("id");
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Not found", "NOT_FOUND");
  assertRestaurantAccess(user, existing.restaurantId);
  const body = c.req.valid("json");
  const item = await prisma.menuItem.update({ where: { id }, data: body });
  return c.json({ data: item });
});

router.delete("/items/:id", async (c) => {
  const user = requireManager(getAuthUser(c));
  const id = c.req.param("id");
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Not found", "NOT_FOUND");
  assertRestaurantAccess(user, existing.restaurantId);
  await prisma.menuItem.update({ where: { id }, data: { isAvailable: false } });
  return c.json({ data: { success: true } });
});

export { router as menuRouter };
