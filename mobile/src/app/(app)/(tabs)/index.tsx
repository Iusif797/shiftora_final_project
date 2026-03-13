import { useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  TrendingUp,
  Users,
  Plus,
} from 'lucide-react-native';
import { AppBackground } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, HighlightCard, MetricCard, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { getLocationForCheckin } from '@/lib/checkin';
import { scheduleShiftReminders } from '@/lib/notifications';
import { useSession } from '@/lib/auth/use-session';
import { formatDate, formatTime, getGreeting } from '@/lib/formatters';
import { anomalyAppearance, colors, roleAppearance, spacing, typography } from '@/theme';
import type { AnalyticsOverview, Anomaly, AppUser, Checkin, ShiftAssignment } from '@/types/app';

function EmployeeDashboard() {
  const queryClient = useQueryClient();
  const { data: upcoming, isLoading, refetch } = useQuery({
    queryKey: ['upcoming-shifts'],
    queryFn: () => api.get<ShiftAssignment[]>('/api/shifts/upcoming'),
  });
  const { data: activeCheckin, refetch: refetchCheckin } = useQuery({
    queryKey: ['active-checkin'],
    queryFn: () => api.get<Checkin | null>('/api/checkins/active'),
  });

  const checkinMutation = useMutation({
    mutationFn: async (id: string) => {
      const location = await getLocationForCheckin();
      const body: Record<string, unknown> = { shiftAssignmentId: id };
      if (location) Object.assign(body, { latitude: location.latitude, longitude: location.longitude });
      return api.post<Checkin>('/api/checkins/checkin', body);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchCheckin();
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (id: string) => api.post<Checkin>('/api/checkins/checkout', { checkinId: id }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchCheckin();
    },
  });

  const { data: history } = useQuery({
    queryKey: ['checkin-history'],
    queryFn: () => api.get<Checkin[]>('/api/checkins/history'),
  });

  useEffect(() => {
    if (upcoming?.length) {
      const shifts = upcoming
        .filter((a) => a.shift)
        .map((a) => ({ id: a.id, title: a.shift!.title, startTime: a.shift!.startTime }));
      scheduleShiftReminders(shifts).catch(() => {});
    }
  }, [upcoming]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand.primary} size="large" />
      </View>
    );
  }

  const nextShift = upcoming?.[0];
  const canCheckIn = nextShift?.shift
    ? Math.abs(new Date(nextShift.shift.startTime).getTime() - Date.now()) <= 60 * 60 * 1000
    : false;

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => {
            refetch();
            refetchCheckin();
          }}
          tintColor={colors.brand.primary}
        />
      }
    >
      {activeCheckin ? (
        <HighlightCard>
          <AccentBadge label="Active shift" color={colors.success.base} tint={colors.success.muted} />
          <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
            {activeCheckin.shiftAssignment?.shift?.title ?? 'On shift'}
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
            Clocked in at {formatTime(activeCheckin.checkinTime)}
          </Text>
          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton
              label="Clock out"
              onPress={() => checkoutMutation.mutate(activeCheckin.id)}
              loading={checkoutMutation.isPending}
              icon={LogOut}
              testID="checkout-button"
            />
          </View>
        </HighlightCard>
      ) : nextShift?.shift ? (
        <HighlightCard>
          <AccentBadge label="Next shift" color={colors.brand.primaryLight} tint="rgba(130,102,255,0.16)" />
          <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
            {nextShift.shift.title}
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
            {formatDate(nextShift.shift.startTime)} · {formatTime(nextShift.shift.startTime)} - {formatTime(nextShift.shift.endTime)}
          </Text>
          {canCheckIn ? (
            <View style={{ marginTop: spacing.xl }}>
              <PrimaryButton
                label="Clock in"
                onPress={() => checkinMutation.mutate(nextShift.id)}
                loading={checkinMutation.isPending}
                icon={LogIn}
                testID="checkin-button"
              />
            </View>
          ) : null}
        </HighlightCard>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="You're all caught up"
          description="No upcoming shifts are scheduled right now."
          color={colors.success.base}
        />
      )}

      <View style={{ marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm }}>
        <MetricCard label="Upcoming" value={upcoming?.length ?? 0} icon={Calendar} color={colors.brand.primary} />
        <MetricCard
          label="Check-in status"
          value={activeCheckin ? 'Live' : 'Idle'}
          icon={Clock3}
          color={activeCheckin ? colors.success.base : colors.brand.gold}
        />
      </View>

      {history && history.length > 0 ? (
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Text style={{ ...typography.h3, color: colors.text.primary, marginBottom: spacing.xs }}>Recent shifts</Text>
          {history.slice(0, 3).map((entry) => (
            <SurfaceCard key={entry.id}>
              <Text style={{ ...typography.h4, color: colors.text.primary }}>
                {entry.shiftAssignment?.shift?.title ?? 'Recorded shift'}
              </Text>
              <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: 4 }}>
                {formatDate(entry.checkinTime)} · {formatTime(entry.checkinTime)}
                {entry.checkoutTime ? ` - ${formatTime(entry.checkoutTime)}` : ' - in progress'}
              </Text>
            </SurfaceCard>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function ManagerDashboard() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get<AnalyticsOverview>('/api/analytics/overview'),
  });
  const { data: anomalies, isLoading } = useQuery({
    queryKey: ['anomalies'],
    queryFn: () => api.get<Anomaly[]>('/api/anomalies'),
  });

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: 100 }}>
      <View style={{ marginBottom: spacing.lg, gap: spacing.md }}>
        <PrimaryButton label="Create shift" icon={Plus} onPress={() => router.push('/(app)/(tabs)/shifts')} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Check-in" icon={LogIn} onPress={() => router.push('/(app)/attendance')} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Schedule" icon={Calendar} onPress={() => router.push('/(app)/(tabs)/shifts')} />
          </View>
        </View>
      </View>

      <HighlightCard>
        <AccentBadge label="Manager overview" color={colors.brand.primaryLight} tint="rgba(130,102,255,0.16)" />
        <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
          Today's operational pulse
        </Text>
        <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
          See attendance, staffing, and alerts without switching screens.
        </Text>
      </HighlightCard>

      <View style={{ marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm }}>
        <MetricCard label="Shifts" value={analytics?.totalShiftsThisWeek ?? 0} icon={Calendar} color={colors.brand.primary} />
        <MetricCard
          label="Attendance"
          value={`${analytics?.attendanceRate ?? 0}%`}
          icon={TrendingUp}
          color={colors.success.base}
        />
      </View>
      <View style={{ marginTop: spacing.sm, flexDirection: 'row', gap: spacing.sm }}>
        <MetricCard label="Active staff" value={analytics?.activeEmployeesCount ?? 0} icon={Users} color={colors.brand.gold} />
        <MetricCard label="Alerts" value={analytics?.anomalyCount ?? 0} icon={AlertTriangle} color={colors.danger.base} />
      </View>

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {(anomalies?.length ?? 0) > 0 ? (
          anomalies?.slice(0, 5).map((anomaly) => {
            const appearance = anomalyAppearance[anomaly.severity] ?? anomalyAppearance.MEDIUM;

            return (
              <SurfaceCard key={anomaly.id}>
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
            );
          })
        ) : !isLoading ? (
          <EmptyState
            icon={CheckCircle2}
            title="No active alerts"
            description="The current team flow looks healthy and under control."
            color={colors.success.base}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function OwnerDashboard() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get<AnalyticsOverview>('/api/analytics/overview'),
  });

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: 100 }}>
      <View style={{ marginBottom: spacing.lg, gap: spacing.md }}>
        <PrimaryButton label="Create shift" icon={Plus} onPress={() => router.push('/(app)/(tabs)/shifts')} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Check-in" icon={LogIn} onPress={() => router.push('/(app)/attendance')} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Schedule" icon={Calendar} onPress={() => router.push('/(app)/(tabs)/shifts')} />
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

export default function Dashboard() {
  const { data: session } = useSession();
  const user = session?.user as AppUser | undefined;
  const role = user?.role ?? 'employee';
  const roleStyle = roleAppearance[role];

  return (
    <AppBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: spacing.sm,
            paddingBottom: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.subtle,
          }}
          testID="dashboard-screen"
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>{getGreeting()}</Text>
              <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: 4 }}>
                {user?.name?.split(' ')[0] ?? 'Welcome'}
              </Text>
            </View>
            <AccentBadge label={role} color={roleStyle.color} tint={`${roleStyle.color}18`} />
          </View>
        </View>

        {role === 'employee' ? <EmployeeDashboard /> : null}
        {role === 'manager' ? <ManagerDashboard /> : null}
        {role === 'owner' ? <OwnerDashboard /> : null}
      </SafeAreaView>
    </AppBackground>
  );
}
