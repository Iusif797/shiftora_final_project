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

/**
 * Удаление собственного аккаунта — App Store Review Guideline 5.1.1(v):
 * приложение, позволяющее создать учётную запись, обязано позволить её и удалить.
 * Деактивации недостаточно, поэтому здесь именно DELETE, а не "isActive = false".
 *
 * Что происходит:
 *  • владелец ресторана — вместе с аккаунтом удаляется и сам ресторан со всеми
 *    его данными (смены, чек-ины, меню, столы, заказы, приглашения, подписка);
 *    у остальных сотрудников удаляется их привязка к этому рабочему пространству,
 *    но их собственные аккаунты остаются — их мы удалять не вправе;
 *  • сотрудник/менеджер — удаляется его карточка сотрудника и его личные записи
 *    (чек-ины, назначения на смены, аномалии); данные ресторана остаются владельцу,
 *    а созданные пользователем смены и заказы переходят на владельца ресторана,
 *    чтобы история заведения не рассыпалась.
 *
 * Сессии, аккаунты провайдеров и загруженные файлы удаляются каскадом (schema.prisma).
 */
router.delete("/me", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized" } }, 401);

  const userId = user.id;

  await prisma.$transaction(
    async (tx) => {
      const ownedRestaurant = await tx.restaurant.findUnique({
        where: { ownerId: userId },
        select: { id: true },
      });

      if (ownedRestaurant) {
        const restaurantId = ownedRestaurant.id;

        await tx.orderItem.deleteMany({ where: { order: { restaurantId } } });
        await tx.order.deleteMany({ where: { restaurantId } });
        await tx.restaurantTable.deleteMany({ where: { restaurantId } });
        await tx.menuItem.deleteMany({ where: { restaurantId } });
        await tx.menuCategory.deleteMany({ where: { restaurantId } });
        await tx.anomaly.deleteMany({ where: { restaurantId } });
        await tx.checkin.deleteMany({ where: { restaurantId } });
        await tx.shiftAssignment.deleteMany({ where: { shift: { restaurantId } } });
        await tx.shift.deleteMany({ where: { restaurantId } });
        await tx.invitation.deleteMany({ where: { restaurantId } });
        await tx.subscription.deleteMany({ where: { restaurantId } });

        const members = await tx.employee.findMany({
          where: { restaurantId },
          select: { userId: true },
        });
        await tx.employee.deleteMany({ where: { restaurantId } });
        const memberIds = members.map((m) => m.userId).filter((id) => id !== userId);
        if (memberIds.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: memberIds } },
            data: { restaurantId: null },
          });
        }

        await tx.restaurant.delete({ where: { id: restaurantId } });
      } else {
        const employee = await tx.employee.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (employee) {
          await tx.anomaly.deleteMany({ where: { employeeId: employee.id } });
          await tx.checkin.deleteMany({ where: { employeeId: employee.id } });
          await tx.shiftAssignment.deleteMany({ where: { employeeId: employee.id } });
          await tx.employee.delete({ where: { id: employee.id } });
        }
      }

      // Приглашения, отправленные этим пользователем, теряют смысл вместе с ним.
      await tx.invitation.deleteMany({ where: { invitedBy: userId } });

      // Смены и заказы, созданные пользователем в чужом ресторане, переводим
      // на владельца этого ресторана: удалить их значило бы стереть чужую историю.
      const orphanShifts = await tx.shift.findMany({
        where: { createdById: userId },
        select: { restaurantId: true },
        distinct: ["restaurantId"],
      });
      const orphanOrders = await tx.order.findMany({
        where: { createdById: userId },
        select: { restaurantId: true },
        distinct: ["restaurantId"],
      });

      const restaurantIds = [
        ...new Set([
          ...orphanShifts.map((s) => s.restaurantId),
          ...orphanOrders.map((o) => o.restaurantId),
        ]),
      ];

      for (const restaurantId of restaurantIds) {
        const restaurant = await tx.restaurant.findUnique({
          where: { id: restaurantId },
          select: { ownerId: true },
        });
        if (!restaurant || restaurant.ownerId === userId) continue;

        await tx.shift.updateMany({
          where: { createdById: userId, restaurantId },
          data: { createdById: restaurant.ownerId },
        });
        await tx.order.updateMany({
          where: { createdById: userId, restaurantId },
          data: { createdById: restaurant.ownerId },
        });
      }

      // Сессии, Account, Asset и Employee уходят каскадом вслед за User.
      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 30_000 },
  );

  return c.json({ data: { deleted: true } });
});

// Присоединение к ресторану выполняется ТОЛЬКО через инвайт-код
// (см. routes/invitations.ts#accept) — там роль и restaurantId берутся из
// записи приглашения на сервере, а не из тела запроса. Прежний эндпоинт
// /join-restaurant позволял клиенту задать себе role: "owner" любого ресторана
// (privilege escalation) и удалён. Создание ресторана владельцем —
// routes/restaurants.ts (POST /), где ownerId выводится из сессии.

export { router as userRouter };
