import { memo, useCallback, useMemo } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Banknote, Sparkles, TrendingUp, Users } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge } from '@/components/buttons';
import { EmptyState, ErrorState, HighlightCard, MetricCard, SurfaceCard } from '@/components/cards';
import { MiniProgress } from '@/components/ui/mini-progress';
import { StaggerItem } from '@/components/ui/motion';
import { ProgressRing } from '@/components/ui/progress-ring';
import { CardListSkeleton, HeroSkeleton, MetricGridSkeleton } from '@/components/ui/skeletons';
import { api } from '@/lib/api/api';
import { anomalyAppearance, colors, spacing, typography } from '@/theme';
import type { AnalyticsOverview } from '@/types/app';

interface EmployeeStat {
  id: string;
  position?: string | null;
  isActive: boolean;
  totalHours: number;
  completedShifts: number;
  punctualityScore: number;
  user: { id: string; name: string; email: string };
}

interface WorkloadSlot {
  day: string;
  start: string;
  end: string;
  needed: number;
  assigned: number;
  shortage: number;
}

interface LaborCost {
  today: number;
  week: number;
  breakdown: { employeeId: string; name: string; today: number; week: number }[];
}

interface AIInsights {
  trends: {
    type: string;
    title: string;
    description: string;
    severity: 'info' | 'warning' | 'success';
  }[];
  recommendations: {
    id: string;
    title: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  staffingHealth: 'optimal' | 'caution' | 'warning' | 'critical';
  metrics: {
    avgHoursPerEmployee: number;
    attendanceRate: number;
    totalAnomalies: number;
    activeEmployees: number;
  };
}

const staffingAppearance = {
  optimal: { color: colors.success.base, tint: colors.success.muted },
  caution: { color: colors.warning.base, tint: colors.warning.muted },
  warning: { color: colors.danger.base, tint: colors.danger.muted },
  critical: { color: colors.danger.base, tint: colors.danger.muted },
} as const;

function AnalyticsScreen() {
  const { data: overview, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get<AnalyticsOverview>('/api/analytics/overview'),
  });
  const { data: employees, refetch: refetchEmployees } = useQuery({
    queryKey: ['analytics-employees'],
    queryFn: () => api.get<EmployeeStat[]>('/api/analytics/employees'),
  });
  const { data: insights, refetch: refetchInsights } = useQuery({
    queryKey: ['analytics-insights'],
    queryFn: () => api.get<AIInsights>('/api/analytics/insights'),
  });
  const { data: laborCost, refetch: refetchLaborCost } = useQuery({
    queryKey: ['analytics-labor-cost'],
    queryFn: () => api.get<LaborCost>('/api/analytics/labor-cost'),
  });
  const { data: workloadForecast, refetch: refetchForecast } = useQuery({
    queryKey: ['analytics-workload-forecast'],
    queryFn: () => api.get<{ slots: WorkloadSlot[] }>('/api/analytics/workload-forecast'),
  });

  const health = useMemo(
    () => staffingAppearance[insights?.staffingHealth ?? 'optimal'],
    [insights?.staffingHealth]
  );
  const handleRetry = useCallback(() => refetch(), [refetch]);
  const handleRefresh = useCallback(() => {
    refetch();
    refetchEmployees();
    refetchInsights();
    refetchLaborCost();
    refetchForecast();
  }, [refetch, refetchEmployees, refetchInsights, refetchLaborCost, refetchForecast]);
  const shortageSlots = useMemo(
    () => workloadForecast?.slots?.filter((s) => s.shortage > 0).slice(0, 5) ?? [],
    [workloadForecast?.slots]
  );
  const sortedEmployees = useMemo(
    () =>
      employees?.slice().sort((a, b) => (a.punctualityScore ?? 0) - (b.punctualityScore ?? 0)) ?? [],
    [employees]
  );

  return (
    <ScreenScroll
      title="Analytics"
      subtitle="AI-powered insights and performance"
      testID="analytics-scroll"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.brand.gold} />
      }
    >
      <View testID="analytics-screen">
        {isLoading ? (
          <View style={{ gap: spacing.lg }} testID="analytics-loading">
            <HeroSkeleton />
            <MetricGridSkeleton rows={2} />
            <CardListSkeleton count={3} />
          </View>
        ) : null}

        {isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Could not load analytics'}
            onRetry={handleRetry}
            testID="analytics-error"
          />
        ) : null}

        {!isError && !isLoading ? (
          <>
            <StaggerItem index={0}>
                {insights ? (
                  <HighlightCard>
                    <AccentBadge label="Staffing health" color={health.color} tint={health.tint} />
                    <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg, textTransform: 'capitalize' }}>
                      {insights.staffingHealth}
                    </Text>
                    <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
                      Average hours and attendance are being tracked in real time for leadership decisions.
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
                      <ProgressRing
                        value={insights.metrics.attendanceRate}
                        size={56}
                        strokeWidth={6}
                        color={health.color}
                        testID="analytics-attendance-ring"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...typography.h4, color: colors.text.primary }}>Attendance rate</Text>
                        <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 2 }}>
                          {insights.metrics.avgHoursPerEmployee}h avg per employee
                        </Text>
                      </View>
                    </View>
                  </HighlightCard>
                ) : null}
            </StaggerItem>

        <StaggerItem index={1} style={{ marginTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <MetricCard label="Hours worked" value={overview?.totalHoursWorked ?? 0} icon={Activity} color={colors.brand.primary} />
            <MetricCard
              label="Attendance"
              value={`${overview?.attendanceRate ?? 0}%`}
              icon={TrendingUp}
              color={colors.success.base}
            />
          </View>
        </StaggerItem>
        <StaggerItem index={2} style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <MetricCard label="Active staff" value={overview?.activeEmployeesCount ?? 0} icon={Users} color={colors.brand.gold} />
            <MetricCard label="Alerts" value={overview?.anomalyCount ?? 0} icon={AlertTriangle} color={colors.danger.base} />
          </View>
        </StaggerItem>

        {(laborCost?.today !== undefined || laborCost?.week !== undefined) ? (
          <StaggerItem index={3} style={{ marginTop: spacing.xl }}>
            <View style={{ gap: spacing.md }}>
              <Text style={{ ...typography.h3, color: colors.text.primary }}>Cost of labor</Text>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <MetricCard
                  label="Today"
                  value={`$${(laborCost?.today ?? 0).toFixed(2)}`}
                  icon={Banknote}
                  color={colors.success.base}
                />
                <MetricCard
                  label="This week"
                  value={`$${(laborCost?.week ?? 0).toFixed(2)}`}
                  icon={Banknote}
                  color={colors.brand.gold}
                />
              </View>
            </View>
          </StaggerItem>
        ) : null}

        {shortageSlots.length ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <StaggerItem index={4}>
              <Text style={{ ...typography.h3, color: colors.text.primary }}>Staffing forecast</Text>
            </StaggerItem>
            {shortageSlots.map((slot, i) => (
              <StaggerItem key={`${slot.day}-${slot.start}`} index={5 + i}>
                <SurfaceCard>
                  <Text style={{ ...typography.h4, color: colors.text.primary }}>
                    {slot.day} {slot.start}-{slot.end}
                  </Text>
                  <Text style={{ ...typography.bodySmall, color: colors.danger.base, marginTop: 4 }}>
                    Short {slot.shortage} staff (need {slot.needed}, have {slot.assigned})
                  </Text>
                </SurfaceCard>
              </StaggerItem>
            ))}
          </View>
        ) : null}

        {insights?.trends?.length ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            {insights.trends.slice(0, 3).map((trend, index) => {
              const appearance =
                trend.severity === 'success'
                  ? anomalyAppearance.LOW
                  : trend.severity === 'warning'
                    ? anomalyAppearance.MEDIUM
                    : { color: colors.info.base, tint: colors.info.muted };

              return (
                <StaggerItem key={trend.title} index={5 + index}>
                  <SurfaceCard>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...typography.h4, color: colors.text.primary }}>{trend.title}</Text>
                        <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>
                          {trend.description}
                        </Text>
                      </View>
                      <AccentBadge label={trend.severity} color={appearance.color} tint={appearance.tint} />
                    </View>
                  </SurfaceCard>
                </StaggerItem>
              );
            })}
          </View>
        ) : null}

        {insights?.recommendations?.length ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            {insights.recommendations.slice(0, 3).map((recommendation, index) => (
              <StaggerItem key={recommendation.id} index={6 + index}>
                <SurfaceCard>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                    <Sparkles color={colors.brand.gold} size={18} strokeWidth={1.8} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.h4, color: colors.text.primary }}>{recommendation.title}</Text>
                      <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>
                        {recommendation.action}
                      </Text>
                    </View>
                  </View>
                </SurfaceCard>
              </StaggerItem>
            ))}
          </View>
        ) : null}

        {sortedEmployees.length ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <StaggerItem index={6}>
              <Text style={{ ...typography.h3, color: colors.text.primary }}>Punctuality</Text>
            </StaggerItem>
            {sortedEmployees.map((employee, index) => {
              const score = employee.punctualityScore ?? 100;
              const scoreColor =
                score >= 90 ? colors.success.base : score >= 70 ? colors.warning.base : colors.danger.base;
              return (
                <StaggerItem key={employee.id} index={7 + index}>
                  <SurfaceCard>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ ...typography.h4, color: colors.text.primary }}>{employee.user.name}</Text>
                      <Text style={{ ...typography.h4, color: scoreColor }}>{score}%</Text>
                    </View>
                    <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>
                      {employee.totalHours}h worked · {employee.completedShifts} shifts
                    </Text>
                    <View style={{ marginTop: spacing.md }}>
                      <MiniProgress value={score} color={scoreColor} />
                    </View>
                  </SurfaceCard>
                </StaggerItem>
              );
            })}
          </View>
        ) : (
          <View style={{ marginTop: spacing.xl }}>
            <EmptyState
              icon={Users}
              title="No analytics yet"
              description="As soon as your team starts logging shifts, the insights panel will populate here."
              color={colors.brand.primary}
            />
          </View>
        )}
          </>
        ) : null}
      </View>
    </ScreenScroll>
  );
}

export default memo(AnalyticsScreen);
