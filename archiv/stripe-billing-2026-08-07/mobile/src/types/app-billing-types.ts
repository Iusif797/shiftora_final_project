// ─── Billing / Subscriptions ─────────────────────────────────────────────────

export type PlanTier = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';

export interface PlanFeatures {
  maxEmployees: number;
  maxShiftsPerMonth: number;
  aiInsights: boolean;
  advancedAnalytics: boolean;
  aiShiftGeneration: boolean;
  multipleManagers: boolean;
  anomalyAlerts: boolean;
  exportReports: boolean;
}

export interface SubscriptionInfo {
  plan: PlanTier;
  planName: string;
  planPrice: string;
  features: PlanFeatures;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  stripeEnabled: boolean;
}

export interface PlanOption {
  tier: PlanTier;
  name: string;
  price: string;
  features: PlanFeatures;
  isCurrent: boolean;
  priceId: string | null;
}

export interface CheckoutSession {
  url: string;
  sessionId: string;
}
