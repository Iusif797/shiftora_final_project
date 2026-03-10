import { ActivityIndicator, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Banknote, Sparkles, TrendingUp, Users } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge } from '@/components/buttons';
import { EmptyState, HighlightCard, MetricCard, SurfaceCard } from '@/components/cards';
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

export default function Analytics() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get<AnalyticsOverview>('/api/analytics/overview'),
  });
  const { data: employees } = useQuery({
    queryKey: ['analytics-employees'],
    queryFn: () => api.get<EmployeeStat[]>('/api/analytics/employees'),
  });
  const { data: insights } = useQuery({
    queryKey: ['analytics-insights'],
    queryFn: () => api.get<AIInsights>('/api/analytics/insights'),
  });
  const { data: laborCost } = useQuery({
    queryKey: ['analytics-labor-cost'],
    queryFn: () => api.get<LaborCost>('/api/analytics/labor-cost'),
  });
  const { data: workloadForecast } = useQuery({
    queryKey: ['analytics-workload-forecast'],
    queryFn: () => api.get<{ slots: WorkloadSlot[] }>('/api/analytics/workload-forecast'),
  });

  const health = staffingAppearance[insights?.staffingHealth ?? 'optimal'];

  return (
    <ScreenScroll title="Analytics" subtitle="AI-powered insights and performance" testID="analytics-scroll">
      <View testID="analytics-screen">
        {isLoading ? (
          <ActivityIndicator
            color={colors.brand.primary}
            style={{ marginTop: spacing.xxxl }}
            testID="analytics-loading"
          />
        ) : null}

        {insights ? (
          <HighlightCard>
            <AccentBadge label="Staffing health" color={health.color} tint={health.tint} />
            <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg, textTransform: 'capitalize' }}>
              {insights.staffingHealth}
            </Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
              Average hours and attendance are being tracked in real time for leadership decisions.
            </Text>
          </HighlightCard>
        ) : null}

        <View style={{ marginTop: spacing.xl, flexDirection: 'row', gap: spacing.md }}>
          <MetricCard label="Hours worked" value={overview?.totalHoursWorked ?? 0} icon={Activity} color={colors.brand.primary} />
          <MetricCard
            label="Attendance"
            value={`${overview?.attendanceRate ?? 0}%`}
            icon={TrendingUp}
            color={colors.success.base}
          />
        </View>
        <View style={{ marginTop: spacing.md, flexDirection: 'row', gap: spacing.md }}>
          <MetricCard label="Active staff" value={overview?.activeEmployeesCount ?? 0} icon={Users} color={colors.brand.gold} />
          <MetricCard label="Alerts" value={overview?.anomalyCount ?? 0} icon={AlertTriangle} color={colors.danger.base} />
        </View>

        {(laborCost?.today !== undefined || laborCost?.week !== undefined) ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
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
        ) : null}

        {workloadForecast?.slots?.filter((s) => s.shortage > 0).length ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Text style={{ ...typography.h3, color: colors.text.primary }}>Staffing forecast</Text>
            {workloadForecast.slots
              .filter((s) => s.shortage > 0)
              .slice(0, 5)
              .map((slot, i) => (
                <SurfaceCard key={i}>
                  <Text style={{ ...typography.h4, color: colors.text.primary }}>
                    {slot.day} {slot.start}-{slot.end}
                  </Text>
                  <Text style={{ ...typography.bodySmall, color: colors.danger.base, marginTop: 4 }}>
                    Short {slot.shortage} staff (need {slot.needed}, have {slot.assigned})
                  </Text>
                </SurfaceCard>
              ))}
          </View>
        ) : null}

        {insights?.trends?.length ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            {insights.trends.slice(0, 3).map((trend) => {
              const appearance =
                trend.severity === 'success'
                  ? anomalyAppearance.LOW
                  : trend.severity === 'warning'
                    ? anomalyAppearance.MEDIUM
                    : { color: colors.info.base, tint: colors.info.muted };

              return (
                <SurfaceCard key={trend.title}>
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
              );
            })}
          </View>
        ) : null}

        {insights?.recommendations?.length ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            {insights.recommendations.slice(0, 3).map((recommendation) => (
              <SurfaceCard key={recommendation.id}>
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
            ))}
          </View>
        ) : null}

        {employees?.length ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Text style={{ ...typography.h3, color: colors.text.primary }}>Punctuality</Text>
            {employees
              .slice()
              .sort((a, b) => (a.punctualityScore ?? 0) - (b.punctualityScore ?? 0))
              .map((employee) => (
                <SurfaceCard key={employee.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ ...typography.h4, color: colors.text.primary }}>{employee.user.name}</Text>
                    <Text
                      style={{
                        ...typography.h4,
                        color:
                          (employee.punctualityScore ?? 100) >= 90
                            ? colors.success.base
                            : (employee.punctualityScore ?? 0) >= 70
                              ? colors.warning.base
                              : colors.danger.base,
                      }}
                    >
                      {employee.punctualityScore ?? 100}%
                    </Text>
                  </View>
                  <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>
                    {employee.totalHours}h worked · {employee.completedShifts} shifts
                  </Text>
                </SurfaceCard>
              ))}
          </View>
        ) : !isLoading ? (
          <View style={{ marginTop: spacing.xl }}>
            <EmptyState
              icon={Users}
              title="No analytics yet"
              description="As soon as your team starts logging shifts, the insights panel will populate here."
              color={colors.brand.primary}
            />
          </View>
        ) : null}
      </View>
    </ScreenScroll>
  );
}
