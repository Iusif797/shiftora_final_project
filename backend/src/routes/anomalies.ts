import { Hono } from "hono";
import { prisma } from "../prisma";
import { type AuthContext, assertRestaurantAccess, getAuthUser } from "../middleware/auth";

const router = new Hono<AuthContext>();

router.use("*", async (c, next) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }
  return next();
});

router.get("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!user.restaurantId) return c.json({ data: [] });

  const isResolved = c.req.query("isResolved");

  const anomalies = await prisma.anomaly.findMany({
    where: {
      restaurantId: user.restaurantId,
      ...(isResolved !== undefined ? { isResolved: isResolved === "true" } : { isResolved: false }),
    },
    include: {
      employee: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, role: true, restaurantId: true } },
        },
      },
      shiftAssignment: { include: { shift: true } },
    },
    orderBy: { detectedAt: "desc" },
  });

  return c.json({ data: anomalies });
});

router.put("/:id/resolve", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const id = c.req.param("id");

  const existing = await prisma.anomaly.findUnique({ where: { id } });
  if (!existing) return c.json({ error: { message: "Not found" } }, 404);
  assertRestaurantAccess(user, existing.restaurantId);

  const body = await c.req.json().catch(() => ({} as { notes?: string }));

  const anomaly = await prisma.anomaly.update({
    where: { id },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      notes: (body as { notes?: string }).notes ?? undefined,
    },
  });

  return c.json({ data: anomaly });
});

export { router as anomalyRouter };
