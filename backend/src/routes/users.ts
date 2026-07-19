import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { type AuthContext, getAuthUser } from "../middleware/auth";

const router = new Hono<AuthContext>();

const pushTokenSchema = z.object({ token: z.string().trim().min(20).max(500) });
const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  image: z.string().url().max(2_000).nullable().optional(),
});

router.get("/me", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { employee: true },
  });

  return c.json({ data: fullUser });
});

router.post("/push-token", zValidator("json", pushTokenSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const { token } = c.req.valid("json");

  await prisma.user.update({
    where: { id: user.id },
    data: { pushToken: token },
  });

  return c.json({ data: { success: true } });
});

router.patch("/me", zValidator("json", updateMeSchema), async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const { name, image } = c.req.valid("json");

  if (image) {
    const asset = await prisma.asset.findFirst({
      where: { userId: user.id, url: image },
      select: { id: true },
    });
    if (!asset) {
      return c.json(
        { error: { message: "Profile image does not belong to this account", code: "INVALID_IMAGE" } },
        400,
      );
    }
  }

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

// Присоединение к ресторану выполняется ТОЛЬКО через инвайт-код
// (см. routes/invitations.ts#accept) — там роль и restaurantId берутся из
// записи приглашения на сервере, а не из тела запроса. Прежний эндпоинт
// /join-restaurant позволял клиенту задать себе role: "owner" любого ресторана
// (privilege escalation) и удалён. Создание ресторана владельцем —
// routes/restaurants.ts (POST /), где ownerId выводится из сессии.

export { router as userRouter };
