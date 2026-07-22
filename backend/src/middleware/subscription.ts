import { prisma } from "../prisma";
import { PLANS, type PlanFeatures, type PlanTier } from "../lib/stripe";
import { AppError } from "./error-handler";

// ─── Fetch or create subscription record ────────────────────────────────────

export async function getSubscription(restaurantId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { restaurantId },
  });
  return sub;
}

export async function getActivePlan(_restaurantId: string): Promise<PlanTier> {
  return "business";
}

export async function getPlanFeatures(_restaurantId: string): Promise<PlanFeatures> {
  return PLANS.business.features;
}

// ─── Feature guard helpers ───────────────────────────────────────────────────

export async function assertFeature(
  restaurantId: string,
  feature: keyof PlanFeatures
): Promise<void> {
  const features = await getPlanFeatures(restaurantId);
  if (!features[feature]) {
    const tier = await getActivePlan(restaurantId);
    throw new AppError(
      402,
      `Эта функция недоступна в плане ${PLANS[tier].name}. Обновите подписку для доступа.`,
      "SUBSCRIPTION_REQUIRED"
    );
  }
}

export async function assertEmployeeLimit(restaurantId: string): Promise<void> {
  const features = await getPlanFeatures(restaurantId);
  if (features.maxEmployees === -1) return; // unlimited

  const count = await prisma.employee.count({
    where: { restaurantId, isActive: true },
  });

  if (count >= features.maxEmployees) {
    const tier = await getActivePlan(restaurantId);
    throw new AppError(
      402,
      `Достигнут лимит сотрудников (${features.maxEmployees}) для плана ${PLANS[tier].name}. Обновите подписку.`,
      "EMPLOYEE_LIMIT_REACHED"
    );
  }
}

export async function assertShiftLimit(restaurantId: string): Promise<void> {
  const features = await getPlanFeatures(restaurantId);
  if (features.maxShiftsPerMonth === -1) return; // unlimited

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.shift.count({
    where: {
      restaurantId,
      createdAt: { gte: startOfMonth },
    },
  });

  if (count >= features.maxShiftsPerMonth) {
    const tier = await getActivePlan(restaurantId);
    throw new AppError(
      402,
      `Достигнут лимит смен в месяц (${features.maxShiftsPerMonth}) для плана ${PLANS[tier].name}. Обновите подписку.`,
      "SHIFT_LIMIT_REACHED"
    );
  }
}

// ─── Response enrichment — attach plan info to context ─────────────────────

export async function withPlanInfo(restaurantId: string) {
  const tier = await getActivePlan(restaurantId);
  return {
    plan: tier,
    features: PLANS[tier].features,
    planName: PLANS[tier].name,
  };
}
