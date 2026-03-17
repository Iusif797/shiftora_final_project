import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type Stripe from "stripe";
import { getStripe, PLANS, planFromPriceId, type PlanTier } from "../lib/stripe";
import { prisma } from "../prisma";
import { env } from "../env";
import { getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";
import { getActivePlan, getSubscription } from "../middleware/subscription";

const billingRouter = new Hono();

// ─── Helper: ensure Stripe customer exists for restaurant ────────────────────

async function ensureStripeCustomer(
  restaurantId: string,
  ownerEmail: string,
  restaurantName: string
): Promise<string> {
  const stripe = getStripe();

  const existing = await prisma.subscription.findUnique({
    where: { restaurantId },
    select: { stripeCustomerId: true },
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: ownerEmail,
    name: restaurantName,
    metadata: { restaurantId },
  });

  // Upsert subscription record with customer ID (free plan until payment)
  await prisma.subscription.upsert({
    where: { restaurantId },
    update: { stripeCustomerId: customer.id },
    create: {
      restaurantId,
      stripeCustomerId: customer.id,
      plan: "free",
      status: "active",
    },
  });

  return customer.id;
}

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

  return c.json({
    data: {
      plan: tier,
      planName: PLANS[tier].name,
      planPrice: PLANS[tier].price,
      features: PLANS[tier].features,
      status: sub?.status ?? "active",
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      trialEnd: sub?.trialEnd ?? null,
      stripeEnabled: !!env.STRIPE_SECRET_KEY,
    },
  });
});

// ─── GET /api/billing/plans ──────────────────────────────────────────────────
// Returns all plans for display on paywall/upgrade screen

billingRouter.get("/plans", async (c) => {
  const user = getAuthUser(c);
  const currentTier: PlanTier = user?.restaurantId
    ? await getActivePlan(user.restaurantId)
    : "free";

  const plans = (Object.entries(PLANS) as [PlanTier, typeof PLANS[PlanTier]][]).map(
    ([tier, plan]) => ({
      tier,
      name: plan.name,
      price: plan.price,
      features: plan.features,
      isCurrent: tier === currentTier,
      priceId:
        tier === "pro"
          ? env.STRIPE_PRO_PRICE_ID
          : tier === "business"
          ? env.STRIPE_BUSINESS_PRICE_ID
          : null,
    })
  );

  return c.json({ data: plans });
});

// ─── POST /api/billing/create-checkout-session ───────────────────────────────
// Creates Stripe Checkout Session for subscription upgrade

billingRouter.post(
  "/create-checkout-session",
  zValidator("json", z.object({ priceId: z.string().min(1) })),
  async (c) => {
    if (!env.STRIPE_SECRET_KEY) {
      return c.json({ error: { message: "Stripe not configured", code: "STRIPE_NOT_CONFIGURED" } }, 503);
    }

    const user = getAuthUser(c);
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    if (!user.restaurantId) {
      return c.json({ error: { message: "No restaurant associated", code: "NO_RESTAURANT" } }, 400);
    }

    const { priceId } = c.req.valid("json");
    const stripe = getStripe();

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { name: true },
    });
    if (!restaurant) throw new AppError(404, "Restaurant not found", "NOT_FOUND");

    const customerId = await ensureStripeCustomer(
      user.restaurantId,
      user.email,
      restaurant.name
    );

    const frontendUrl = env.FRONTEND_URL;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/billing?canceled=1`,
      subscription_data: {
        metadata: { restaurantId: user.restaurantId },
        trial_period_days: 14,
      },
      allow_promotion_codes: true,
      metadata: { restaurantId: user.restaurantId },
    });

    return c.json({ data: { url: session.url, sessionId: session.id } });
  }
);

// ─── POST /api/billing/create-portal-session ────────────────────────────────
// Opens Stripe Customer Portal (manage billing, cancel, update payment)

billingRouter.post("/create-portal-session", async (c) => {
  if (!env.STRIPE_SECRET_KEY) {
    return c.json({ error: { message: "Stripe not configured", code: "STRIPE_NOT_CONFIGURED" } }, 503);
  }

  const user = getAuthUser(c);
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  if (!user.restaurantId) {
    return c.json({ error: { message: "No restaurant associated", code: "NO_RESTAURANT" } }, 400);
  }

  const sub = await prisma.subscription.findUnique({
    where: { restaurantId: user.restaurantId },
    select: { stripeCustomerId: true },
  });

  if (!sub?.stripeCustomerId) {
    return c.json({ error: { message: "No billing account found", code: "NO_BILLING_ACCOUNT" } }, 400);
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.FRONTEND_URL}/billing`,
  });

  return c.json({ data: { url: session.url } });
});

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
    console.error("Webhook signature verification failed:", err);
    return c.json({ error: { message: "Invalid signature", code: "INVALID_SIGNATURE" } }, 400);
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error(`Failed to handle webhook event ${event.type}:`, err);
    // Still return 200 so Stripe doesn't retry — log for investigation
  }

  return c.json({ data: { received: true } });
});

// ─── Webhook event handler ───────────────────────────────────────────────────

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
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
