import { Hono } from "hono";
import { randomInt } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { type AuthContext, assertRestaurantAccess, getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

const router = new Hono<AuthContext>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars[randomInt(chars.length)];
  }
  return code;
}

const createInvitationSchema = z.object({
  role: z.enum(["employee", "manager"]).default("employee"),
  email: z.string().trim().toLowerCase().email().optional(),
});

router.post("/", zValidator("json", createInvitationSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);
  if (!["manager", "owner"].includes(user.role)) {
    return c.json({ error: { message: "Forbidden" } }, 403);
  }
  if (!user.restaurantId) return c.json({ error: { message: "No restaurant" } }, 400);

  const { role, email } = c.req.valid("json");
  if (user.role === "manager" && role === "manager") {
    return c.json(
      { error: { message: "Only the owner can invite managers", code: "FORBIDDEN" } },
      403,
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  let code = generateCode();
  let attempts = 0;
  while (await prisma.invitation.findUnique({ where: { code } })) {
    if (attempts >= 8) {
      return c.json(
        { error: { message: "Could not generate invite code", code: "CODE_GEN_FAILED" } },
        500,
      );
    }
    code = generateCode();
    attempts++;
  }

  const invitation = await prisma.invitation.create({
    data: {
      code,
      restaurantId: user.restaurantId,
      role,
      invitedBy: user.id,
      email: email ?? null,
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

  if (invitation.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return c.json(
      { error: { message: "This invitation was sent to another email", code: "EMAIL_MISMATCH" } },
      403,
    );
  }

  await prisma.$transaction(async (tx) => {
    const currentUser = await tx.user.findUnique({
      where: { id: user.id },
      select: {
        restaurantId: true,
        role: true,
        employee: { select: { restaurantId: true } },
      },
    });
    if (!currentUser) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    if (
      currentUser.restaurantId &&
      currentUser.restaurantId !== invitation.restaurantId
    ) {
      throw new AppError(
        409,
        "Leave the current restaurant before accepting another invitation",
        "ALREADY_IN_RESTAURANT",
      );
    }
    if (currentUser.role === "owner") {
      throw new AppError(409, "Restaurant owners cannot join as staff", "OWNER_CONFLICT");
    }
    if (
      currentUser.employee &&
      currentUser.employee.restaurantId !== invitation.restaurantId
    ) {
      throw new AppError(
        409,
        "This account has employee history in another restaurant",
        "EMPLOYEE_HISTORY_CONFLICT",
      );
    }

    const claimed = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      data: { status: "ACCEPTED", usedBy: user.id },
    });
    if (claimed.count !== 1) {
      throw new AppError(409, "Invitation was already used or expired", "INVITATION_UNAVAILABLE");
    }

    await tx.user.update({
      where: { id: user.id },
      data: { restaurantId: invitation.restaurantId, role: invitation.role },
    });
    await tx.employee.upsert({
      where: { userId: user.id },
      update: { restaurantId: invitation.restaurantId, isActive: true },
      create: { userId: user.id, restaurantId: invitation.restaurantId },
    });
  });

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
  assertRestaurantAccess(user, invitation.restaurantId);

  const revoked = await prisma.invitation.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REVOKED" },
  });
  if (revoked.count !== 1) {
    return c.json(
      { error: { message: "Only pending invitations can be revoked", code: "INVALID_STATE" } },
      409,
    );
  }

  return c.json({ data: { success: true } });
});

export { router as invitationRouter };
