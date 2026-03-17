import type { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Lock, Zap, Star, Building2 } from 'lucide-react-native';
import { colors, radius, spacing, shadows, typography } from '@/theme';
import type { PlanTier } from '@/types/app';

// ─── Plan color map ──────────────────────────────────────────────────────────

const PLAN_STYLE: Record<
  PlanTier,
  { color: string; gradient: [string, string]; Icon: typeof Lock }
> = {
  free: {
    color: '#888888',
    gradient: ['#2C2C2C', '#1A1A1A'],
    Icon: Lock,
  },
  pro: {
    color: '#8266FF',
    gradient: ['#4C3ABF', '#8266FF'],
    Icon: Zap,
  },
  business: {
    color: '#E7B15F',
    gradient: ['#B9813E', '#E7B15F'],
    Icon: Building2,
  },
};

// ─── PaywallGate — wraps locked content ─────────────────────────────────────

interface PaywallGateProps {
  /** If false — renders children normally */
  locked: boolean;
  /** Minimum plan required to unlock */
  requiredPlan: PlanTier;
  /** Short description of what this feature does */
  featureLabel: string;
  children: ReactNode;
}

export function PaywallGate({
  locked,
  requiredPlan,
  featureLabel,
  children,
}: PaywallGateProps) {
  if (!locked) return <>{children}</>;

  const plan = PLAN_STYLE[requiredPlan];
  const PlanIcon = plan.Icon;

  return (
    <View style={styles.gateContainer} testID="paywall-gate">
      {/* Blurred-out ghost of the content */}
      <View style={styles.blurredContent} pointerEvents="none">
        {children}
      </View>

      {/* Overlay */}
      <View style={styles.overlay}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.92)', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.overlayContent}>
          <LinearGradient
            colors={plan.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBadge}
          >
            <PlanIcon color="#FFFFFF" size={22} strokeWidth={2.5} />
          </LinearGradient>

          <Text style={styles.lockTitle}>{featureLabel}</Text>
          <Text style={styles.lockSubtitle}>
            Доступно в плане{' '}
            <Text style={{ color: plan.color }}>
              {requiredPlan === 'pro' ? 'Pro' : 'Business'}
            </Text>
          </Text>

          <Pressable
            onPress={() => router.push('/(app)/billing')}
            testID="paywall-upgrade-button"
            style={({ pressed }) => [styles.upgradeBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <LinearGradient
              colors={plan.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.upgradeBtnInner}
            >
              <Zap color="#FFFFFF" size={15} strokeWidth={2.5} />
              <Text style={styles.upgradeBtnText}>Обновить план</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── FeatureLockBadge — inline chip for locked items ────────────────────────

interface FeatureLockBadgeProps {
  requiredPlan: PlanTier;
}

export function FeatureLockBadge({ requiredPlan }: FeatureLockBadgeProps) {
  const plan = PLAN_STYLE[requiredPlan];
  const label = requiredPlan === 'pro' ? 'Pro' : 'Business';

  return (
    <View
      style={[
        styles.lockBadge,
        { backgroundColor: `${plan.color}18`, borderColor: `${plan.color}38` },
      ]}
    >
      <Lock color={plan.color} size={10} strokeWidth={2.5} />
      <Text style={[styles.lockBadgeText, { color: plan.color }]}>{label}</Text>
    </View>
  );
}

// ─── PlanBadge — show current plan ──────────────────────────────────────────

interface PlanBadgeProps {
  plan: PlanTier;
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  const style = PLAN_STYLE[plan];
  const PlanIcon = style.Icon;
  const label = plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Business';

  return (
    <View
      style={[
        styles.planBadge,
        { backgroundColor: `${style.color}18`, borderColor: `${style.color}38` },
      ]}
    >
      <PlanIcon color={style.color} size={12} strokeWidth={2.5} />
      <Text style={[styles.planBadgeText, { color: style.color }]}>{label}</Text>
    </View>
  );
}

// ─── LimitWarning — shows when approaching plan limit ───────────────────────

interface LimitWarningProps {
  current: number;
  max: number;
  label: string;
}

export function LimitWarning({ current, max, label }: LimitWarningProps) {
  if (max === -1) return null;
  const pct = current / max;
  if (pct < 0.8) return null;

  const isAtLimit = current >= max;
  const color = isAtLimit ? colors.danger.base : colors.warning.base;
  const bgColor = isAtLimit ? colors.danger.muted : colors.warning.muted;
  const borderColor = isAtLimit ? colors.danger.border : colors.warning.border;

  return (
    <View style={[styles.limitWarning, { backgroundColor: bgColor, borderColor }]}>
      <Text style={[styles.limitWarningText, { color }]}>
        {isAtLimit
          ? `Достигнут лимит ${label} (${max}). Обновите план.`
          : `${label}: ${current}/${max} — скоро лимит`}
      </Text>
      <Pressable onPress={() => router.push('/(app)/billing')}>
        <Text style={[styles.limitWarningLink, { color }]}>Обновить →</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gateContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.xl,
  },
  blurredContent: {
    opacity: 0.15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  overlayContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  lockTitle: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  lockSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  upgradeBtn: {
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.soft,
  },
  upgradeBtnInner: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  upgradeBtnText: {
    ...typography.h4,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  limitWarningText: {
    ...typography.caption,
    flex: 1,
  },
  limitWarningLink: {
    ...typography.caption,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
});
