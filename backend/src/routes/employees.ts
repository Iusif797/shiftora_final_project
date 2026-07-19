import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { type AuthContext, assertRestaurantAccess, getAuthUser } from "../middleware/auth";
import { assertEmployeeLimit } from "../middleware/subscription";

const router = new Hono<AuthContext>();

const MANAGER_ROLES = ["manager", "owner"];
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  restaurantId: true,
} as const;

const profileSchema = z.object({
  position: z.string().max(80).optional(),
});

const updateSchema = z.object({
  position: z.string().max(80).optional(),
  hourlyRate: z.coerce.number().nonnegative().max(100_000).optional(),
  isActive: z.boolean().optional(),
});

// Ставка сотрудника — чувствительные данные. Обычный сотрудник не должен видеть
// hourlyRate коллег; для роли, не входящей в MANAGER_ROLES, обнуляем поле.
function scrubHourlyRate<T extends { hourlyRate: number | null }>(
  employee: T,
  viewerRole: string,
): T {
  if (MANAGER_ROLES.includes(viewerRole)) return employee;
  return { ...employee, hourlyRate: null };
}

router.get("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!MANAGER_ROLES.includes(user.role)) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }
  if (!user.restaurantId) return c.json({ data: { items: [], total: 0, page: 1, totalPages: 0 } });

  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 20));
  const skip = (page - 1) * limit;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where: { restaurantId: user.restaurantId },
      include: { user: { select: publicUserSelect } },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.employee.count({ where: { restaurantId: user.restaurantId } }),
  ]);

  const items = employees.map((e) => scrubHourlyRate(e, user.role));
  const totalPages = Math.ceil(total / limit);
  return c.json({ data: { items, total, page, totalPages } });
});

router.post("/profile", zValidator("json", profileSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (user.role === "owner") {
    return c.json({ error: { message: "Owners do not have employee profiles", code: "FORBIDDEN" } }, 403);
  }
  if (!user.restaurantId) return c.json({ error: { message: "No restaurant assigned" } }, 400);

  const { position } = c.req.valid("json");

  // Only enforce limit when creating a new employee profile
  const existingEmployee = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!existingEmployee) {
    await assertEmployeeLimit(user.restaurantId);
  }

  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    update: {
      position: position ?? null,
    },
    create: {
      userId: user.id,
      restaurantId: user.restaurantId,
      position: position ?? null,
    },
    include: { user: { select: publicUserSelect } },
  });

  return c.json({ data: employee });
});

router.get("/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!MANAGER_ROLES.includes(user.role)) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }
  if (!user.restaurantId) return c.json({ error: { message: "No restaurant assigned" } }, 403);

  const id = c.req.param("id");
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { user: { select: publicUserSelect } },
  });

  if (!employee) return c.json({ error: { message: "Not found" } }, 404);
  assertRestaurantAccess(user, employee.restaurantId);

  return c.json({ data: scrubHourlyRate(employee, user.role) });
});

router.put("/:id", zValidator("json", updateSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!MANAGER_ROLES.includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const id = c.req.param("id");

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { user: { select: { role: true } } },
  });
  if (!employee) return c.json({ error: { message: "Not found" } }, 404);
  assertRestaurantAccess(user, employee.restaurantId);
  if (user.role === "manager" && employee.user.role === "manager") {
    return c.json(
      { error: { message: "Only the owner can edit managers", code: "FORBIDDEN" } },
      403,
    );
  }

  const { position, hourlyRate, isActive } = c.req.valid("json");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id },
      data: {
        position: position ?? undefined,
        hourlyRate: hourlyRate ?? undefined,
        isActive: isActive ?? undefined,
      },
    });

    if (isActive !== undefined) {
      await tx.user.update({
        where: { id: employee.userId },
        data: { restaurantId: isActive ? employee.restaurantId : null },
      });
      if (!isActive) {
        await tx.session.deleteMany({ where: { userId: employee.userId } });
      }
    }

    return tx.employee.findUniqueOrThrow({
      where: { id },
      include: { user: { select: publicUserSelect } },
    });
  });

  return c.json({ data: updated });
});

export { router as employeeRouter };
