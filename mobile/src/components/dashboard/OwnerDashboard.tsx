import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, AlertTriangle, Calendar, LayoutGrid, LogIn, Plus, Users } from 'lucide-react-native';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { ErrorState, HighlightCard, MetricCard } from '@/components/cards';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { StaggerItem } from '@/components/ui/motion';
import { ProgressRing } from '@/components/ui/progress-ring';
import { HeroSkeleton, MetricGridSkeleton } from '@/components/ui/skeletons';
import { api } from '@/lib/api/api';
import { colors, spacing, typography } from '@/theme';
import type { AnalyticsOverview } from '@/types/app';

export function OwnerDashboard() {
  const { data: analytics, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get<AnalyticsOverview>('/api/analytics/overview'),
  });

  if (isError && !analytics) {
    return (
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.brand.primary} />
        }
      >
        <ErrorState
          message={error instanceof Error ? error.message : 'Could not load dashboard data'}
          onRetry={() => refetch()}
          testID="owner-dashboard-error"
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.brand.primary} />
      }
      accessibilityLabel="Owner dashboard"
    >
      <StaggerItem index={0}>
        <View style={{ marginBottom: spacing.lg, gap: spacing.md }}>
          <PrimaryButton
            label="Create shift"
            icon={Plus}
            onPress={() => router.push({ pathname: '/(app)/(tabs)/shifts', params: { create: String(Date.now()) } })}
            accessibilityLabel="Create new shift"
          />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label="Check-in"
                icon={LogIn}
                onPress={() => router.push('/(app)/attendance')}
                accessibilityLabel="Open check-in"
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label="Floor"
                icon={LayoutGrid}
                onPress={() => router.push('/(app)/(tabs)/floor')}
                accessibilityLabel="Open floor plan"
              />
            </View>
          </View>
        </View>
      </StaggerItem>

      {isLoading && !analytics ? (
        <View style={{ gap: spacing.lg }} testID="owner-dashboard-loading">
          <HeroSkeleton />
          <MetricGridSkeleton rows={2} />
        </View>
      ) : (
        <>
          <StaggerItem index={1}>
            <HighlightCard>
              <AccentBadge label="Business pulse" color={colors.brand.gold} tint={colors.warning.muted} />
              <AnimatedNumber
                value={analytics?.totalHoursWorked ?? 0}
                textStyle={{ ...typography.display, color: colors.text.primary, marginTop: spacing.lg }}
                testID="owner-hours-value"
              />
              <Text style={{ ...typography.body, color: colors.text.secondary }}>hours worked this week</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
                <ProgressRing
                  value={analytics?.attendanceRate ?? 0}
                  size={56}
                  strokeWidth={6}
                  testID="owner-attendance-ring"
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.h4, color: colors.text.primary }}>Attendance rate</Text>
                  <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 2 }}>
                    across this week
                  </Text>
                </View>
              </View>
            </HighlightCard>
          </StaggerItem>

          <StaggerItem index={2} style={{ marginTop: spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <MetricCard label="Weekly shifts" value={analytics?.totalShiftsThisWeek ?? 0} icon={Calendar} color={colors.brand.primary} />
              <MetricCard label="Active staff" value={analytics?.activeEmployeesCount ?? 0} icon={Users} color={colors.brand.gold} />
            </View>
          </StaggerItem>
          <StaggerItem index={3} style={{ marginTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <MetricCard
                label="Open alerts"
                value={analytics?.anomalyCount ?? 0}
                icon={AlertTriangle}
                color={(analytics?.anomalyCount ?? 0) > 0 ? colors.danger.base : colors.success.base}
                onPress={() => router.push('/(app)/alerts')}
                testID="owner-alerts-card"
              />
              <MetricCard
                label="Coverage"
                value={`${analytics?.totalHoursWorked ?? 0}h`}
                icon={Activity}
                color={colors.brand.secondary}
              />
            </View>
          </StaggerItem>
        </>
      )}
    </ScrollView>
  );
}
