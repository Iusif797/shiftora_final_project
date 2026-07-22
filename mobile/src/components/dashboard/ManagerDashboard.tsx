import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Calendar, CheckCircle2, LogIn, Plus, TrendingUp, Users } from 'lucide-react-native';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, ErrorState, HighlightCard, MetricCard, SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { CardListSkeleton, HeroSkeleton, MetricGridSkeleton } from '@/components/ui/skeletons';
import { api } from '@/lib/api/api';
import { anomalyAppearance, colors, spacing, typography } from '@/theme';
import type { AnalyticsOverview, Anomaly } from '@/types/app';

export function ManagerDashboard() {
  const { data: analytics, isLoading: loadingAnalytics, isRefetching: refreshingAnalytics, isError: errorAnalytics, error: analyticsError, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get<AnalyticsOverview>('/api/analytics/overview'),
  });
  const { data: anomalies, isLoading: loadingAnomalies, isRefetching: refreshingAnomalies, isError: errorAnomalies, error: anomaliesError, refetch: refetchAnomalies } = useQuery({
    queryKey: ['anomalies'],
    queryFn: () => api.get<Anomaly[]>('/api/anomalies'),
  });

  const isLoading = loadingAnalytics || loadingAnomalies;
  const isError = errorAnalytics || errorAnomalies;
  const errorMessage = analyticsError instanceof Error ? analyticsError.message : anomaliesError instanceof Error ? anomaliesError.message : 'Could not load dashboard data';
  const onRefresh = () => {
    refetchAnalytics();
    refetchAnomalies();
  };

  if (isError && !analytics) {
    return (
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.brand.primary} />
        }
      >
        <ErrorState message={errorMessage} onRetry={onRefresh} testID="manager-dashboard-error" />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshingAnalytics || refreshingAnomalies}
          onRefresh={onRefresh}
          tintColor={colors.brand.primary}
        />
      }
      accessibilityLabel="Manager dashboard"
    >
      <StaggerItem index={0}>
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
      </StaggerItem>

      {isLoading && !analytics ? (
        <View style={{ gap: spacing.lg }} testID="manager-dashboard-loading">
          <HeroSkeleton />
          <MetricGridSkeleton rows={2} />
          <CardListSkeleton count={2} />
        </View>
      ) : (
        <>
          <StaggerItem index={1}>
            <HighlightCard>
              <AccentBadge label="Manager overview" color={colors.brand.primaryLight} tint="rgba(130,102,255,0.16)" />
              <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
                Today's operational pulse
              </Text>
              <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
                See attendance, staffing, and alerts without switching screens.
              </Text>
            </HighlightCard>
          </StaggerItem>

          <StaggerItem index={2} style={{ marginTop: spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <MetricCard label="Shifts" value={analytics?.totalShiftsThisWeek ?? 0} icon={Calendar} color={colors.brand.primary} />
              <MetricCard
                label="Attendance"
                value={`${analytics?.attendanceRate ?? 0}%`}
                icon={TrendingUp}
                color={colors.success.base}
              />
            </View>
          </StaggerItem>
          <StaggerItem index={3} style={{ marginTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <MetricCard label="Active staff" value={analytics?.activeEmployeesCount ?? 0} icon={Users} color={colors.brand.gold} />
              <MetricCard label="Alerts" value={analytics?.anomalyCount ?? 0} icon={AlertTriangle} color={colors.danger.base} onPress={() => router.push('/(app)/alerts')} testID="manager-alerts-card" />
            </View>
          </StaggerItem>

          <StaggerItem index={4} style={{ marginTop: spacing.lg }}>
            <SecondaryButton label="View all alerts" icon={AlertTriangle} onPress={() => router.push('/(app)/alerts')} testID="manager-view-alerts-button" />
          </StaggerItem>
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            {(anomalies?.length ?? 0) > 0 ? (
              anomalies?.slice(0, 5).map((anomaly, index) => {
                const appearance = anomalyAppearance[anomaly.severity] ?? anomalyAppearance.MEDIUM;
                return (
                  <StaggerItem key={anomaly.id} index={5 + index}>
                    <SurfaceCard>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...typography.h4, color: colors.text.primary }}>
                            {anomaly.employee?.user?.name ?? 'Unknown employee'}
                          </Text>
                          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>
                            {anomaly.type.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        <AccentBadge label={anomaly.severity} color={appearance.color} tint={appearance.tint} />
                      </View>
                    </SurfaceCard>
                  </StaggerItem>
                );
              })
            ) : !loadingAnomalies ? (
              <EmptyState
                icon={CheckCircle2}
                title="No active alerts"
                description="The current team flow looks healthy and under control."
                color={colors.success.base}
              />
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}
