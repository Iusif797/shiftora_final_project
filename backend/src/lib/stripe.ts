import Stripe from "stripe";
import { env } from "../env";

// Stripe client — lazy init so app runs without STRIPE_SECRET_KEY in dev
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// ─── Plan definitions ────────────────────────────────────────────────────────

export type PlanTier = "free" | "pro" | "business";

export interface PlanFeatures {
  maxEmployees: number;         // -1 = unlimited
  maxShiftsPerMonth: number;    // -1 = unlimited
  aiInsights: boolean;
  advancedAnalytics: boolean;
  aiShiftGeneration: boolean;
  multipleManagers: boolean;    // more than 1 manager role
  anomalyAlerts: boolean;
  exportReports: boolean;
}

// Приложение раздаётся бесплатно: продажи тарифов нет, цен здесь тоже нет.
// Поле `price` удалено намеренно — прайс-лист не должен существовать в коде,
// иначе он рано или поздно снова утечёт в публичный ответ API.
export const PLANS: Record<PlanTier, { name: string; features: PlanFeatures }> = {
  free: {
    name: "Free",
    features: {
      maxEmployees: 5,
      maxShiftsPerMonth: 20,
      aiInsights: false,
      advancedAnalytics: false,
      aiShiftGeneration: false,
      multipleManagers: false,
      anomalyAlerts: false,
      exportReports: false,
    },
  },
  pro: {
    name: "Pro",
    features: {
      maxEmployees: 25,
      maxShiftsPerMonth: -1,
      aiInsights: true,
      advancedAnalytics: true,
      aiShiftGeneration: true,
      multipleManagers: false,
      anomalyAlerts: true,
      exportReports: false,
    },
  },
  business: {
    name: "Business",
    features: {
      maxEmployees: -1,
      maxShiftsPerMonth: -1,
      aiInsights: true,
      advancedAnalytics: true,
      aiShiftGeneration: true,
      multipleManagers: true,
      anomalyAlerts: true,
      exportReports: true,
    },
  },
};

// Map Stripe price IDs to plan tiers
export function planFromPriceId(priceId: string): PlanTier {
  if (priceId === env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === env.STRIPE_BUSINESS_PRICE_ID) return "business";
  return "free";
}
