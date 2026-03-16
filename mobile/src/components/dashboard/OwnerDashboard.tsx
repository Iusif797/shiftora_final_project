import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, AlertTriangle, Calendar, LogIn, Plus, Users } from 'lucide-react-native';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { ErrorState, HighlightCard, MetricCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { colors, spacing, typography } from '@/theme';
import type { AnalyticsOverview } from '@/types/app';

export function OwnerDashboard() {
  const { data: analytics, isLoading, isError, error, refetch } = useQuery({
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
          message={error instanceof Error ? error.message : 'Не удалось загрузить данные'}
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
        <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={colors.brand.primary} />
      }
      accessibilityLabel="Owner dashboard"
    >
      <View style={{ marginBottom: spacing.lg, gap: spacing.md }}>
        <PrimaryButton
          label="Create shift"
          icon={Plus}
          onPress={() => router.push('/(app)/(tabs)/shifts')}
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
              label="Schedule"
              icon={Calendar}
              onPress={() => router.push('/(app)/(tabs)/shifts')}
              accessibilityLabel="View schedule"
            />
          </View>
        </View>
      </View>

      <HighlightCard>
        <AccentBadge label="Business pulse" color={colors.brand.gold} tint={colors.warning.muted} />
        <Text style={{ ...typography.display, color: colors.text.primary, marginTop: spacing.lg }}>
          {analytics?.totalHoursWorked ?? 0}
        </Text>
        <Text style={{ ...typography.body, color: colors.text.secondary }}>hours worked this week</Text>
        <Text style={{ ...typography.h3, color: colors.success.base, marginTop: spacing.lg }}>
          {analytics?.attendanceRate ?? 0}% attendance rate
        </Text>
      </HighlightCard>

      <View style={{ marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm }}>
        <MetricCard label="Weekly shifts" value={analytics?.totalShiftsThisWeek ?? 0} icon={Calendar} color={colors.brand.primary} />
        <MetricCard label="Active staff" value={analytics?.activeEmployeesCount ?? 0} icon={Users} color={colors.brand.gold} />
      </View>
      <View style={{ marginTop: spacing.sm, flexDirection: 'row', gap: spacing.sm }}>
        <MetricCard
          label="Open alerts"
          value={analytics?.anomalyCount ?? 0}
          icon={AlertTriangle}
          color={(analytics?.anomalyCount ?? 0) > 0 ? colors.danger.base : colors.success.base}
        />
        <MetricCard
          label="Coverage"
          value={`${analytics?.totalHoursWorked ?? 0}h`}
          icon={Activity}
          color={colors.brand.secondary}
        />
      </View>
    </ScrollView>
  );
}
