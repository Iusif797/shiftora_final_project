import { Hono } from "hono";
import { prisma } from "../prisma";
import { type AuthContext, getAuthUser } from "../middleware/auth";

const router = new Hono<AuthContext>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

router.post("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }
  if (!user.restaurantId) return c.json({ error: { message: "No restaurant" } }, 400);

  const body = await c.req.json().catch(() => ({}));
  const role = body.role === "manager" ? "manager" : "employee";
  const email = body.email ?? null;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.invitation.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  const invitation = await prisma.invitation.create({
    data: {
      code,
      restaurantId: user.restaurantId,
      role,
      invitedBy: user.id,
      email,
      expiresAt,
    },
    include: { restaurant: { select: { name: true } } },
  });

  return c.json({ data: invitation });
});

router.get("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }
  if (!user.restaurantId) return c.json({ data: [] });

  const invitations = await prisma.invitation.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return c.json({ data: invitations });
});

router.get("/verify/:code", async (c) => {
  const code = c.req.param("code").toUpperCase();

  const invitation = await prisma.invitation.findUnique({
    where: { code },
    include: { restaurant: { select: { id: true, name: true } } },
  });

  if (!invitation) return c.json({ error: { message: "Invalid invitation code" } }, 404);
  if (invitation.status !== "PENDING") {
    return c.json({ error: { message: "Invitation already used or revoked" } }, 400);
  }
  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return c.json({ error: { message: "Invitation has expired" } }, 400);
  }

  return c.json({
    data: {
      id: invitation.id,
      code: invitation.code,
      role: invitation.role,
      restaurant: invitation.restaurant,
    },
  });
});

router.post("/accept/:code", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const code = c.req.param("code").toUpperCase();

  const invitation = await prisma.invitation.findUnique({
    where: { code },
    include: { restaurant: true },
  });

  if (!invitation) return c.json({ error: { message: "Invalid invitation code" } }, 404);
  if (invitation.status !== "PENDING") {
    return c.json({ error: { message: "Invitation already used or revoked" } }, 400);
  }
  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return c.json({ error: { message: "Invitation has expired" } }, 400);
  }

  await prisma.$transaction([
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", usedBy: user.id },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { restaurantId: invitation.restaurantId, role: invitation.role },
    }),
    prisma.employee.upsert({
      where: { userId: user.id },
      update: { restaurantId: invitation.restaurantId, isActive: true },
      create: { userId: user.id, restaurantId: invitation.restaurantId },
    }),
  ]);

  return c.json({
    data: {
      success: true,
      restaurantId: invitation.restaurantId,
      restaurantName: invitation.restaurant.name,
      role: invitation.role,
    },
  });
});

router.delete("/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  const id = c.req.param("id");

  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) return c.json({ error: { message: "Not found" } }, 404);
  if (invitation.restaurantId !== user.restaurantId) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }

  await prisma.invitation.update({
    where: { id },
    data: { status: "REVOKED" },
  });

  return c.json({ data: { success: true } });
});

export { router as invitationRouter };
