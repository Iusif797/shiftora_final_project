import { useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Calendar, CheckCircle2, Clock3, LogIn, LogOut } from 'lucide-react-native';
import { AccentBadge, PrimaryButton } from '@/components/buttons';
import { EmptyState, ErrorState, HighlightCard, MetricCard, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { getLocationForCheckin } from '@/lib/checkin';
import { scheduleShiftReminders } from '@/lib/notifications';
import { showError, showSuccess } from '@/lib/toast';
import { formatDate, formatTime } from '@/lib/formatters';
import { colors, spacing, typography } from '@/theme';
import type { Checkin, ShiftAssignment } from '@/types/app';

export function EmployeeDashboard() {
  const queryClient = useQueryClient();
  const { data: upcoming, isLoading, isError, error, refetch } = useQuery({
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
      showSuccess('Clocked in', 'Your shift has started');
      refetchCheckin();
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError('Check-in failed', err.message);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (id: string) => api.post<Checkin>('/api/checkins/checkout', { checkinId: id }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess('Clocked out', 'Your shift has ended');
      refetchCheckin();
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError('Checkout failed', err.message);
    },
  });

  const { data: history } = useQuery({
    queryKey: ['checkin-history'],
    queryFn: () => api.get<{ items: Checkin[] }>('/api/checkins/history?limit=20'),
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Loading shifts">
        <ActivityIndicator color={colors.brand.primary} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.xl, flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.brand.primary} />
        }
      >
        <ErrorState
          message={error instanceof Error ? error.message : 'Не удалось загрузить смены'}
          onRetry={() => refetch()}
          testID="employee-dashboard-error"
        />
      </ScrollView>
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
      accessibilityLabel="Employee dashboard"
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

      {history?.items && history.items.length > 0 ? (
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Text style={{ ...typography.h3, color: colors.text.primary, marginBottom: spacing.xs }}>Recent shifts</Text>
          {history.items.slice(0, 3).map((entry) => (
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
