import { Hono } from "hono";
import { prisma } from "../prisma";
import { type AuthContext, assertRestaurantAccess, getAuthUser } from "../middleware/auth";

const router = new Hono<AuthContext>();

router.get("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!user.restaurantId) return c.json({ data: { items: [], total: 0, page: 1, totalPages: 0 } });

  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 20));
  const skip = (page - 1) * limit;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where: { restaurantId: user.restaurantId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.employee.count({ where: { restaurantId: user.restaurantId } }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return c.json({ data: { items: employees, total, page, totalPages } });
});

router.post("/profile", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!user.restaurantId) return c.json({ error: { message: "No restaurant assigned" } }, 400);

  const body = await c.req.json();
  const { position, hourlyRate } = body;

  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    update: {
      position: position ?? null,
      hourlyRate: hourlyRate ? Number(hourlyRate) : null,
    },
    create: {
      userId: user.id,
      restaurantId: user.restaurantId,
      position: position ?? null,
      hourlyRate: hourlyRate ? Number(hourlyRate) : null,
    },
    include: { user: true },
  });

  return c.json({ data: employee });
});

router.get("/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const id = c.req.param("id");
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!employee) return c.json({ error: { message: "Not found" } }, 404);
  if (user.restaurantId && employee.restaurantId) {
    assertRestaurantAccess(user, employee.restaurantId);
  }

  return c.json({ data: employee });
});

router.put("/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const id = c.req.param("id");

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return c.json({ error: { message: "Not found" } }, 404);
  if (employee.restaurantId) assertRestaurantAccess(user, employee.restaurantId);

  const body = await c.req.json();
  const { position, hourlyRate, isActive } = body;

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      position: position ?? undefined,
      hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    },
    include: { user: true },
  });

  return c.json({ data: updated });
});

export { router as employeeRouter };
