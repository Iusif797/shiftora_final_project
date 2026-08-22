import { Hono } from "hono";
import type Stripe from "stripe";
import { getStripe, PLANS, planFromPriceId, type PlanTier } from "../lib/stripe";
import { prisma } from "../prisma";
import { env } from "../env";
import { getAuthUser } from "../middleware/auth";
import { getActivePlan, getSubscription } from "../middleware/subscription";
import { logger } from "../lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Приложение бесплатное. Подписки не продаются, тарифов нет.
//
// Раньше здесь жили: публичный прайс-лист (GET /plans отдавал платные тарифы с
// ценами вообще без авторизации), создание Stripe Checkout и портал
// подписки. Ничего из этого не работало — STRIPE_SECRET_KEY на проде нет,
// price ID не заданы, а getActivePlan() всё равно возвращает "business" всем.
// Продавать было нечего, а витрина висела наружу.
//
// Оставлены только:
//   • GET /subscription — что аккаунту доступно (без цен и названий тарифов);
//   • GET /plans        — список функций, чтобы старые сборки клиента не падали;
//   • POST /webhook     — ⚠️ НУЖЕН: через него подтверждается оплата ЕДЫ в POS
//                         (orders.ts, session.mode === "payment"). Не удалять.
// ─────────────────────────────────────────────────────────────────────────────

const billingRouter = new Hono();

// ─── GET /api/billing/subscription ──────────────────────────────────────────
// Returns current subscription status + plan info

billingRouter.get("/subscription", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  if (!user.restaurantId) {
    return c.json({ error: { message: "No restaurant associated", code: "NO_RESTAURANT" } }, 400);
  }

  const sub = await getSubscription(user.restaurantId);
  const tier = await getActivePlan(user.restaurantId);

  // Ни цены, ни названия тарифа, ни признака «можно купить» — продажи нет.
  return c.json({
    data: {
      features: PLANS[tier].features,
      status: sub?.status ?? "active",
    },
  });
});

// ─── GET /api/billing/plans ──────────────────────────────────────────────────
// Ручка публичная (без авторизации) — именно её видит рецензент App Store.
// Раньше отдавала прайс-лист. Теперь отдаёт только список функций, которые в
// приложении доступны всем и бесплатно: ни тарифов, ни цен, ни Stripe price ID.

billingRouter.get("/plans", (c) => {
  return c.json({ data: { features: PLANS.business.features } });
});

// Ручки POST /create-checkout-session и POST /create-portal-session удалены:
// это был путь покупки подписки. Вызывал их только экран paywall, который уже
// убран из приложения (archiv/stripe-billing-2026-08-07). Оплату еды в POS они
// не трогали — та идёт своим путём через orders.ts.

// ─── POST /api/billing/webhook ───────────────────────────────────────────────
// Stripe webhook — must be raw body, no JSON parse

billingRouter.post("/webhook", async (c) => {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: { message: "Stripe not configured", code: "STRIPE_NOT_CONFIGURED" } }, 503);
  }

  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: { message: "Missing signature", code: "MISSING_SIGNATURE" } }, 400);
  }

  const rawBody = await c.req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    return c.json({ error: { message: "Invalid signature", code: "INVALID_SIGNATURE" } }, 400);
  }

  const existingEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { id: event.id },
    select: { status: true },
  });
  if (existingEvent?.status === "COMPLETED") {
    return c.json({ data: { received: true, duplicate: true } });
  }

  await prisma.stripeWebhookEvent.upsert({
    where: { id: event.id },
    create: { id: event.id, type: event.type, status: "PROCESSING" },
    update: {
      type: event.type,
      status: "PROCESSING",
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  try {
    await handleStripeEvent(event);
    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { status: "COMPLETED", processedAt: new Date(), lastError: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 2_000) : "Unknown webhook error";
    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { status: "FAILED", lastError: message },
    });
    logger.error({ err, eventId: event.id, eventType: event.type }, "Failed to handle webhook event");
    return c.json(
      { error: { message: "Webhook processing failed", code: "WEBHOOK_PROCESSING_FAILED" } },
      500,
    );
  }

  return c.json({ data: { received: true } });
});

// ─── Webhook event handler ───────────────────────────────────────────────────

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        const orderId = session.metadata?.orderId;
        const restaurantId = session.metadata?.restaurantId;
        if (!orderId || !restaurantId || session.payment_status !== "paid") break;

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (
          !order ||
          order.restaurantId !== restaurantId ||
          session.amount_total !== Math.round(order.totalAmount * 100) ||
          session.currency?.toLowerCase() !== "usd"
        ) {
          logger.error({ eventId: event.id, orderId }, "Stripe order payment metadata mismatch");
          break;
        }

        await prisma.$transaction(async (tx) => {
          const paid = await tx.order.updateMany({
            where: { id: orderId, paymentStatus: "UNPAID" },
            data: {
              paymentStatus: "PAID",
              paymentMethod: "STRIPE",
              status: "PAID",
              paidAt: new Date(),
            },
          });
          if (paid.count === 1) {
            await tx.restaurantTable.update({
              where: { id: order.tableId },
              data: { status: "FREE" },
            });
          }
        });
        break;
      }

      if (session.mode !== "subscription" || !session.subscription) break;

      const restaurantId = session.metadata?.restaurantId;
      if (!restaurantId) break;

      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      await upsertSubscription(restaurantId, subscription);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const restaurantId = subscription.metadata?.restaurantId;
      if (!restaurantId) {
        // Fallback: look up by customer
        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: subscription.customer as string },
        });
        if (sub) await upsertSubscription(sub.restaurantId, subscription);
      } else {
        await upsertSubscription(restaurantId, subscription);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          plan: "free",
          status: "canceled",
          stripeSubscriptionId: null,
          stripePriceId: null,
          cancelAtPeriodEnd: false,
        },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: { status: "past_due" },
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId, status: "past_due" },
        data: { status: "active" },
      });
      break;
    }
  }
}

async function upsertSubscription(
  restaurantId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const plan = priceId ? planFromPriceId(priceId) : "free";

  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    trialing: "trialing",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    unpaid: "past_due",
    paused: "past_due",
  };

  // In Stripe SDK v20, billing period dates are on the subscription item
  const firstItem = subscription.items.data[0];
  const periodStart = firstItem?.current_period_start ?? null;
  const periodEnd = firstItem?.current_period_end ?? null;

  await prisma.subscription.upsert({
    where: { restaurantId },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan: plan as PlanTier,
      status: (statusMap[subscription.status] ?? "active") as any,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    },
    create: {
      restaurantId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan: plan as PlanTier,
      status: (statusMap[subscription.status] ?? "active") as any,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    },
  });
}

export { billingRouter };
