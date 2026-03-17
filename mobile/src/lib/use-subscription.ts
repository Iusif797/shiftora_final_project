import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { api } from './api/api';
import type { SubscriptionInfo, PlanOption, PlanTier, PlanFeatures } from '@/types/app';

export const SUBSCRIPTION_QUERY_KEY = ['subscription'] as const;
export const PLANS_QUERY_KEY = ['billing-plans'] as const;

// ─── Fetch current subscription ──────────────────────────────────────────────

export function useSubscription() {
  return useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: () => api.get<SubscriptionInfo>('/api/billing/subscription'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ─── Fetch all available plans ───────────────────────────────────────────────

export function usePlans() {
  return useQuery({
    queryKey: PLANS_QUERY_KEY,
    queryFn: () => api.get<PlanOption[]>('/api/billing/plans'),
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Create checkout session and open Stripe Checkout ────────────────────────

export function useUpgradePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (priceId: string) => {
      const result = await api.post<{ url: string; sessionId: string }>(
        '/api/billing/create-checkout-session',
        { priceId }
      );
      if (result.url) {
        await Linking.openURL(result.url);
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate subscription after returning from checkout
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
      }, 2000);
    },
  });
}

// ─── Open Stripe Customer Portal ─────────────────────────────────────────────

export function useManageBilling() {
  return useMutation({
    mutationFn: async () => {
      const result = await api.post<{ url: string }>('/api/billing/create-portal-session');
      if (result.url) {
        await Linking.openURL(result.url);
      }
      return result;
    },
  });
}

// ─── Feature flag helpers ─────────────────────────────────────────────────────

export function useHasFeature(feature: keyof PlanFeatures): boolean {
  const { data } = useSubscription();
  if (!data) return false;
  const val = data.features[feature];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  return false;
}

export function useIsAtLimit(
  type: 'employees' | 'shifts',
  currentCount: number
): boolean {
  const { data } = useSubscription();
  if (!data) return false;
  const limit =
    type === 'employees'
      ? data.features.maxEmployees
      : data.features.maxShiftsPerMonth;
  if (limit === -1) return false;
  return currentCount >= limit;
}

export function usePlanTier(): PlanTier {
  const { data } = useSubscription();
  return data?.plan ?? 'free';
}

export function useIsActivePlan(): boolean {
  const { data } = useSubscription();
  if (!data) return false;
  return data.status === 'active' || data.status === 'trialing';
}
