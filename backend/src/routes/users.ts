import { Hono } from "hono";
import { prisma } from "../prisma";
import { type AuthContext, getAuthUser } from "../middleware/auth";

const router = new Hono<AuthContext>();

router.get("/me", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { employee: true },
  });

  return c.json({ data: fullUser });
});

router.patch("/me", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const body = await c.req.json();
  const { name, image } = body;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name ?? undefined,
      image: image !== undefined ? image : undefined,
    },
    include: { employee: true },
  });

  return c.json({ data: updated });
});

router.post("/join-restaurant", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const body = await c.req.json();
  const { restaurantId, role } = body;

  if (!restaurantId) return c.json({ error: { message: "restaurantId required" } }, 400);

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) return c.json({ error: { message: "Restaurant not found" } }, 404);

  const userRole = role || "employee";

  await prisma.user.update({
    where: { id: user.id },
    data: { restaurantId, role: userRole },
  });

  if (userRole !== "owner") {
    await prisma.employee.upsert({
      where: { userId: user.id },
      update: { restaurantId, isActive: true },
      create: { userId: user.id, restaurantId },
    });
  }

  return c.json({ data: { success: true, restaurantId } });
});

export { router as userRouter };
