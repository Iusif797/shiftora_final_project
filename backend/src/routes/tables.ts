import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { type AuthContext, assertRestaurantAccess, getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

const router = new Hono<AuthContext>();

const tableSchema = z.object({
  number: z.coerce.number().int().positive(),
  label: z.string().max(40).optional().nullable(),
  capacity: z.coerce.number().int().positive().optional(),
  status: z.enum(["FREE", "OCCUPIED", "RESERVED"]).optional(),
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

const orderInclude = {
  items: { include: { menuItem: true }, orderBy: { createdAt: "asc" as const } },
};

router.get("/", async (c) => {
  const user = requireStaff(getAuthUser(c));
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: user.restaurantId! },
    orderBy: { number: "asc" },
    include: {
      orders: {
        where: { status: { notIn: ["PAID", "CANCELLED"] } },
        take: 1,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return c.json({ data: tables });
});

router.post("/", zValidator("json", tableSchema), async (c) => {
  const user = requireManager(getAuthUser(c));
  const body = c.req.valid("json");
  const table = await prisma.restaurantTable.create({
    data: {
      restaurantId: user.restaurantId!,
      number: body.number,
      label: body.label ?? null,
      capacity: body.capacity ?? 4,
      status: body.status ?? "FREE",
    },
  });
  return c.json({ data: table });
});

router.put("/:id", zValidator("json", tableSchema.partial()), async (c) => {
  const user = requireManager(getAuthUser(c));
  const id = c.req.param("id");
  const existing = await prisma.restaurantTable.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Not found", "NOT_FOUND");
  assertRestaurantAccess(user, existing.restaurantId);
  const table = await prisma.restaurantTable.update({
    where: { id },
    data: c.req.valid("json"),
  });
  return c.json({ data: table });
});

router.delete("/:id", async (c) => {
  const user = requireManager(getAuthUser(c));
  const id = c.req.param("id");
  const existing = await prisma.restaurantTable.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Not found", "NOT_FOUND");
  assertRestaurantAccess(user, existing.restaurantId);
  const openOrder = await prisma.order.findFirst({
    where: { tableId: id, status: { notIn: ["PAID", "CANCELLED"] } },
  });
  if (openOrder) throw new AppError(400, "Table has open order", "TABLE_BUSY");
  await prisma.restaurantTable.delete({ where: { id } });
  return c.json({ data: { success: true } });
});

export { router as tablesRouter };
