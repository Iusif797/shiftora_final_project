import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  Zap,
  Building2,
  Crown,
  Check,
  X,
  ArrowLeft,
  CreditCard,
  AlertTriangle,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { StaggerItem } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useSubscription, usePlans, useUpgradePlan, useManageBilling, SUBSCRIPTION_QUERY_KEY } from '@/lib/use-subscription';
import type { PlanOption, PlanTier } from '@/types/app';
import { format } from 'date-fns';

// ─── Plan tier visual config ─────────────────────────────────────────────────

const PLAN_VISUAL: Record<PlanTier, { gradient: [string, string]; Icon: typeof Zap; glow: string }> = {
  free: {
    gradient: ['#2C2C2C', '#1A1A1A'],
    Icon: Crown,
    glow: '#888888',
  },
  pro: {
    gradient: ['#4C3ABF', '#8266FF'],
    Icon: Zap,
    glow: '#8266FF',
  },
  business: {
    gradient: ['#9B6B1E', '#E7B15F'],
    Icon: Building2,
    glow: '#E7B15F',
  },
};

// ─── Feature row ─────────────────────────────────────────────────────────────

function FeatureRow({ label, value }: { label: string; value: boolean | number | string }) {
  const isEnabled = value === true || (typeof value === 'number' && value !== 0);
  const displayValue =
    typeof value === 'boolean'
      ? null
      : value === -1
      ? '∞'
      : String(value);

  return (
    <View style={styles.featureRow}>
      <View style={styles.featureCheck}>
        {isEnabled ? (
          <Check color={colors.success.base} size={14} strokeWidth={2.5} />
        ) : (
          <X color={colors.text.tertiary} size={14} strokeWidth={2.5} />
        )}
      </View>
      <Text style={[styles.featureLabel, { color: isEnabled ? colors.text.secondary : colors.text.tertiary }]}>
        {label}
        {displayValue ? (
          <Text style={{ color: isEnabled ? colors.text.primary : colors.text.tertiary }}>
            {' '}·{' '}{displayValue}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

// ─── Plan card ───────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onUpgrade,
  isUpgrading,
}: {
  plan: PlanOption;
  onUpgrade: (priceId: string) => void;
  isUpgrading: boolean;
}) {
  const visual = PLAN_VISUAL[plan.tier];
  const PlanIcon = visual.Icon;

  const featureRows: { label: string; value: boolean | number }[] = [
    { label: 'Employees', value: plan.features.maxEmployees },
    { label: 'Shifts per month', value: plan.features.maxShiftsPerMonth },
    { label: 'AI insights', value: plan.features.aiInsights },
    { label: 'AI shift generation', value: plan.features.aiShiftGeneration },
    { label: 'Advanced analytics', value: plan.features.advancedAnalytics },
    { label: 'Multiple managers', value: plan.features.multipleManagers },
    { label: 'Anomaly alerts', value: plan.features.anomalyAlerts },
    { label: 'Report exports', value: plan.features.exportReports },
  ];

  return (
    <View
      style={[
        styles.planCard,
        plan.isCurrent && styles.planCardActive,
        plan.isCurrent && { borderColor: `${visual.glow}50` },
      ]}
      testID={`plan-card-${plan.tier}`}
    >
      {/* Header */}
      <View style={styles.planHeader}>
        <LinearGradient
          colors={visual.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.planIconWrap}
        >
          <PlanIcon color="#FFFFFF" size={20} strokeWidth={2.5} />
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={styles.planName}>{plan.name}</Text>
            {plan.isCurrent ? (
              <View style={[styles.currentBadge, { backgroundColor: `${visual.glow}20`, borderColor: `${visual.glow}40` }]}>
                <Text style={[styles.currentBadgeText, { color: visual.glow }]}>Current</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.planPrice, { color: plan.tier === 'free' ? colors.text.secondary : visual.glow }]}>
            {plan.price}
          </Text>
        </View>
      </View>

      {/* Features list */}
      <View style={styles.featuresList}>
        {featureRows.map((f) => (
          <FeatureRow key={f.label} label={f.label} value={f.value} />
        ))}
      </View>

      {/* CTA */}
      {plan.tier !== 'free' && !plan.isCurrent && plan.priceId ? (
        <ScalePressable
          onPress={() => onUpgrade(plan.priceId!)}
          disabled={isUpgrading}
          scale={0.98}
          haptic="medium"
          testID={`upgrade-button-${plan.tier}`}
        >
          <LinearGradient
            colors={visual.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaButton}
          >
            {isUpgrading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <PlanIcon color="#FFFFFF" size={16} strokeWidth={2.5} />
                <Text style={styles.ctaText}>
                  {plan.tier === 'pro' ? 'Upgrade to Pro' : 'Upgrade to Business'}
                </Text>
              </>
            )}
          </LinearGradient>
        </ScalePressable>
      ) : plan.tier === 'free' && plan.isCurrent ? (
        <View style={styles.freeCta}>
          <Text style={styles.freeCtaText}>Base plan — always free</Text>
        </View>
      ) : null}

      {plan.tier !== 'free' && !plan.isCurrent ? (
        <Text style={styles.trialNote}>14-day free trial, no card required</Text>
      ) : null}
    </View>
  );
}

// ─── Subscription status banner ──────────────────────────────────────────────

function StatusBanner() {
  const { data: sub } = useSubscription();
  const manageBilling = useManageBilling();

  if (!sub || sub.plan === 'free') return null;

  const isPastDue = sub.status === 'past_due';
  const isTrialing = sub.status === 'trialing';
  const isCanceling = sub.cancelAtPeriodEnd;

  if (!isPastDue && !isTrialing && !isCanceling) return null;

  return (
    <View
      style={[
        styles.statusBanner,
        isPastDue && { backgroundColor: colors.danger.muted, borderColor: colors.danger.border },
        isTrialing && { backgroundColor: colors.info.muted, borderColor: colors.info.border },
        isCanceling && { backgroundColor: colors.warning.muted, borderColor: colors.warning.border },
      ]}
    >
      <AlertTriangle
        color={isPastDue ? colors.danger.base : isTrialing ? colors.info.base : colors.warning.base}
        size={16}
        strokeWidth={2}
      />
      <Text style={[styles.statusBannerText, {
        color: isPastDue ? colors.danger.base : isTrialing ? colors.info.base : colors.warning.base
      }]}>
        {isPastDue ? 'Payment failed — update your payment method' : null}
        {isTrialing && sub.trialEnd ? `Trial ends ${format(new Date(sub.trialEnd), 'd MMM yyyy')}` : null}
        {isCanceling && sub.currentPeriodEnd ? `Subscription ends ${format(new Date(sub.currentPeriodEnd), 'd MMM yyyy')}` : null}
      </Text>
      <ScalePressable
        onPress={() => manageBilling.mutate()}
        disabled={manageBilling.isPending}
        scale={0.9}
      >
        <Text style={[styles.statusBannerLink, {
          color: isPastDue ? colors.danger.base : isTrialing ? colors.info.base : colors.warning.base
        }]}>
          {manageBilling.isPending ? '...' : 'Manage →'}
        </Text>
      </ScalePressable>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BillingScreen() {
  const { success, canceled } = useLocalSearchParams<{ success?: string; canceled?: string }>();
  const queryClient = useQueryClient();
  const { data: sub, isLoading: subLoading } = useSubscription();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const upgradePlan = useUpgradePlan();
  const manageBilling = useManageBilling();

  // Refresh subscription after successful checkout redirect
  useEffect(() => {
    if (success === '1') {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [success, queryClient]);

  const isLoading = subLoading || plansLoading;

  return (
    <View style={styles.screen} testID="billing-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <ScalePressable
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            scale={0.9}
            style={styles.backBtn}
            testID="billing-back-button"
          >
            <ArrowLeft color={colors.text.primary} size={22} strokeWidth={2} />
          </ScalePressable>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Success / canceled banners */}
          {success === '1' ? (
            <View style={styles.successBanner}>
              <Check color={colors.success.base} size={18} strokeWidth={2.5} />
              <Text style={styles.successBannerText}>Subscription activated!</Text>
            </View>
          ) : null}
          {canceled === '1' ? (
            <View style={styles.canceledBanner}>
              <X color={colors.text.secondary} size={16} strokeWidth={2} />
              <Text style={styles.canceledBannerText}>Payment canceled</Text>
            </View>
          ) : null}

          <StatusBanner />

          {/* Hero */}
          <View style={styles.hero}>
            <LinearGradient
              colors={['rgba(130,102,255,0.15)', 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.heroBg}
            />
            <Text style={styles.heroTitle}>Unlock the full potential</Text>
            <Text style={styles.heroSubtitle}>
              Choose the right plan for your restaurant and scale without limits
            </Text>
          </View>

          {/* Current period info */}
          {sub?.plan !== 'free' && sub?.currentPeriodEnd ? (
            <View style={styles.periodInfo}>
              <Clock color={colors.text.tertiary} size={14} strokeWidth={2} />
              <Text style={styles.periodInfoText}>
                Next billing date: {format(new Date(sub.currentPeriodEnd), 'd MMM yyyy')}
              </Text>
            </View>
          ) : null}

          {/* Plans */}
          {isLoading ? (
            <View testID="billing-loading">
              <CardListSkeleton count={3} />
            </View>
          ) : plans ? (
            <View style={styles.plansGrid}>
              {plans.map((plan, index) => (
                <StaggerItem key={plan.tier} index={index}>
                  <PlanCard
                    plan={plan}
                    onUpgrade={(priceId) => upgradePlan.mutate(priceId)}
                    isUpgrading={upgradePlan.isPending}
                  />
                </StaggerItem>
              ))}
            </View>
          ) : null}

          {/* Manage billing button (for paid users) */}
          {sub && sub.plan !== 'free' && sub.stripeEnabled ? (
            <ScalePressable
              onPress={() => manageBilling.mutate()}
              disabled={manageBilling.isPending}
              scale={0.98}
              testID="manage-billing-button"
              style={styles.manageBtn}
            >
              {manageBilling.isPending ? (
                <ActivityIndicator color={colors.text.secondary} size="small" />
              ) : (
                <CreditCard color={colors.text.secondary} size={16} strokeWidth={2} />
              )}
              <Text style={styles.manageBtnText}>
                {manageBilling.isPending ? 'Opening...' : 'Manage subscription and billing'}
              </Text>
            </ScalePressable>
          ) : null}

          {/* Stripe not configured notice */}
          {sub && !sub.stripeEnabled ? (
            <View style={styles.stripeNotice}>
              <Text style={styles.stripeNoticeText}>
                To enable paid plans, configure Stripe in the server settings.
              </Text>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  hero: {
    position: 'relative',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderRadius: radius.xl,
  },
  heroBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.xl,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
  periodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  periodInfoText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  plansGrid: {
    gap: spacing.md,
  },
  planCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
    ...shadows.card,
  },
  planCardActive: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  planPrice: {
    ...typography.body,
    fontWeight: '600',
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  featuresList: {
    gap: 10,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureCheck: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    ...typography.bodySmall,
  },
  ctaButton: {
    height: 48,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.soft,
  },
  ctaText: {
    ...typography.h4,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  freeCta: {
    height: 44,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  freeCtaText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  trialNote: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  manageBtnText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  statusBannerText: {
    ...typography.caption,
    flex: 1,
  },
  statusBannerLink: {
    ...typography.caption,
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.success.muted,
    borderWidth: 1,
    borderColor: colors.success.border,
    marginBottom: spacing.md,
  },
  successBannerText: {
    ...typography.body,
    color: colors.success.base,
    fontWeight: '600',
  },
  canceledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.md,
  },
  canceledBannerText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  stripeNotice: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  stripeNoticeText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
