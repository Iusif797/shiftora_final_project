import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { env } from "../env";
import { getStripe } from "../lib/stripe";
import { type AuthContext, assertRestaurantAccess, getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";
import { recalculateOrder, syncOrderStatus } from "../services/order-totals";

const router = new Hono<AuthContext>();

const createOrderSchema = z.object({ tableId: z.string().min(1) });
const addItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().positive().default(1),
  notes: z.string().max(200).optional(),
});
const updateItemSchema = z.object({
  quantity: z.coerce.number().int().positive().optional(),
  notes: z.string().max(200).optional(),
  status: z.enum(["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"]).optional(),
});
const paySchema = z.object({
  method: z.enum(["CASH", "CARD", "STRIPE"]),
});

const orderInclude = {
  items: { include: { menuItem: true }, orderBy: { createdAt: "asc" as const } },
  table: true,
};

function requireStaff(user: ReturnType<typeof getAuthUser>) {
  if (!user) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  if (!user.restaurantId) throw new AppError(400, "No restaurant", "NO_RESTAURANT");
  return user;
}

async function getOrderForUser(orderId: string, user: NonNullable<ReturnType<typeof getAuthUser>>) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, "Order not found", "NOT_FOUND");
  assertRestaurantAccess(user, order.restaurantId);
  return order;
}

router.get("/", async (c) => {
  const user = requireStaff(getAuthUser(c));
  const status = c.req.query("status");
  const orders = await prisma.order.findMany({
    where: {
      restaurantId: user.restaurantId!,
      ...(status ? { status: status as never } : { status: { notIn: ["PAID", "CANCELLED"] } }),
    },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return c.json({ data: orders });
});

router.get("/:id", async (c) => {
  const user = requireStaff(getAuthUser(c));
  const order = await getOrderForUser(c.req.param("id"), user);
  return c.json({ data: order });
});

router.post("/", zValidator("json", createOrderSchema), async (c) => {
  const user = requireStaff(getAuthUser(c));
  const { tableId } = c.req.valid("json");
  const table = await prisma.restaurantTable.findUnique({ where: { id: tableId } });
  if (!table || table.restaurantId !== user.restaurantId) {
    throw new AppError(404, "Table not found", "NOT_FOUND");
  }

  const existing = await prisma.order.findFirst({
    where: { tableId, status: { notIn: ["PAID", "CANCELLED"] } },
    include: orderInclude,
  });
  if (existing) return c.json({ data: existing });

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        restaurantId: user.restaurantId!,
        tableId,
        createdById: user.id,
      },
      include: orderInclude,
    });
    await tx.restaurantTable.update({
      where: { id: tableId },
      data: { status: "OCCUPIED" },
    });
    return created;
  });

  return c.json({ data: order });
});

router.post("/:id/items", zValidator("json", addItemSchema), async (c) => {
  const user = requireStaff(getAuthUser(c));
  const orderId = c.req.param("id");
  const order = await getOrderForUser(orderId, user);
  if (order.paymentStatus === "PAID") throw new AppError(400, "Order already paid", "ORDER_PAID");

  const body = c.req.valid("json");
  const menuItem = await prisma.menuItem.findUnique({ where: { id: body.menuItemId } });
  if (!menuItem || menuItem.restaurantId !== user.restaurantId || !menuItem.isAvailable) {
    throw new AppError(400, "Menu item unavailable", "ITEM_UNAVAILABLE");
  }

  await prisma.orderItem.create({
    data: {
      orderId,
      menuItemId: menuItem.id,
      nameSnapshot: menuItem.name,
      priceSnapshot: menuItem.price,
      quantity: body.quantity,
      notes: body.notes,
    },
  });

  const updated = await recalculateOrder(orderId);
  await syncOrderStatus(orderId);
  const fresh = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  return c.json({ data: fresh ?? updated });
});

router.patch("/:id/items/:itemId", zValidator("json", updateItemSchema), async (c) => {
  const user = requireStaff(getAuthUser(c));
  const orderId = c.req.param("id");
  const itemId = c.req.param("itemId");
  await getOrderForUser(orderId, user);
  const body = c.req.valid("json");

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item || item.orderId !== orderId) throw new AppError(404, "Item not found", "NOT_FOUND");

  await prisma.orderItem.update({ where: { id: itemId }, data: body });
  const updated = await recalculateOrder(orderId);
  await syncOrderStatus(orderId);
  const fresh = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  return c.json({ data: fresh ?? updated });
});

router.delete("/:id/items/:itemId", async (c) => {
  const user = requireStaff(getAuthUser(c));
  const orderId = c.req.param("id");
  const itemId = c.req.param("itemId");
  await getOrderForUser(orderId, user);
  await prisma.orderItem.update({ where: { id: itemId }, data: { status: "CANCELLED" } });
  const updated = await recalculateOrder(orderId);
  await syncOrderStatus(orderId);
  const fresh = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  return c.json({ data: fresh ?? updated });
});

router.post("/:id/pay", zValidator("json", paySchema), async (c) => {
  const user = requireStaff(getAuthUser(c));
  const orderId = c.req.param("id");
  const { method } = c.req.valid("json");
  let order = await getOrderForUser(orderId, user);

  if (order.items.filter((i) => i.status !== "CANCELLED").length === 0) {
    throw new AppError(400, "Order is empty", "ORDER_EMPTY");
  }
  if (order.paymentStatus === "PAID") throw new AppError(400, "Already paid", "ALREADY_PAID");

  order = await recalculateOrder(orderId);

  if (method === "STRIPE") {
    if (!env.STRIPE_SECRET_KEY) {
      throw new AppError(400, "Stripe not configured", "STRIPE_DISABLED");
    }
    const stripe = getStripe();
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId! },
      include: { owner: true },
    });
    if (!restaurant) throw new AppError(404, "Restaurant not found", "NOT_FOUND");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: restaurant.owner.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Table ${order.table.number} order`,
              description: `${restaurant.name} · ${order.items.length} items`,
            },
            unit_amount: Math.round(order.totalAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/order-success?orderId=${orderId}`,
      cancel_url: `${env.FRONTEND_URL}/order-cancel?orderId=${orderId}`,
      metadata: { orderId, restaurantId: user.restaurantId! },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod: "STRIPE", stripeCheckoutSession: session.id },
    });

    return c.json({ data: { url: session.url, sessionId: session.id } });
  }

  const paid = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: method,
        paymentStatus: "PAID",
        status: "PAID",
        paidAt: new Date(),
      },
      include: orderInclude,
    });
    await tx.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
    return result;
  });

  return c.json({ data: paid });
});

router.post("/:id/cancel", async (c) => {
  const user = requireStaff(getAuthUser(c));
  const orderId = c.req.param("id");
  const order = await getOrderForUser(orderId, user);
  if (order.paymentStatus === "PAID") throw new AppError(400, "Cannot cancel paid order", "ORDER_PAID");

  const cancelled = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: orderInclude,
    });
    await tx.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
    return result;
  });

  return c.json({ data: cancelled });
});


router.post("/:id/confirm-payment", async (c) => {
  const user = requireStaff(getAuthUser(c));
  const orderId = c.req.param("id");
  const order = await getOrderForUser(orderId, user);
  if (order.paymentStatus === "PAID") return c.json({ data: order });
  if (!order.stripeCheckoutSession) {
    throw new AppError(400, "No Stripe session", "NO_STRIPE_SESSION");
  }
  if (!env.STRIPE_SECRET_KEY) throw new AppError(400, "Stripe not configured", "STRIPE_DISABLED");

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSession);
  if (session.payment_status !== "paid") {
    return c.json({ data: { paid: false, status: session.payment_status } });
  }

  const paid = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        status: "PAID",
        paymentMethod: "STRIPE",
        paidAt: new Date(),
      },
      include: orderInclude,
    });
    await tx.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
    return result;
  });

  return c.json({ data: { paid: true, order: paid } });
});

export { router as ordersRouter };

