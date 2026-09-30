import { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Calendar, CheckCircle2, Clock3, LogIn, LogOut } from 'lucide-react-native';
import { AccentBadge, PrimaryButton } from '@/components/buttons';
import { EmptyState, ErrorState, HighlightCard, MetricCard, SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { CardListSkeleton, HeroSkeleton, MetricGridSkeleton } from '@/components/ui/skeletons';
import { useT } from '@/i18n/I18nProvider';
import { api } from '@/lib/api/api';
import {
  OFFLINE_CHECKIN_QUEUE_KEY,
  useOfflineCheckinQueue,
} from '@/hooks/use-offline-checkin-sync';
import { getPendingCheckin } from '@/lib/offline-checkin-queue';
import { scheduleShiftReminders } from '@/lib/notifications';
import { submitCheckin, submitCheckout } from '@/lib/submit-checkin';
import { showError, showSuccess } from '@/lib/toast';
import { formatDate, formatTime } from '@/lib/formatters';
import { colors, spacing, typography } from '@/theme';
import type { Checkin, ShiftAssignment } from '@/types/app';

export function EmployeeDashboard() {
  const t = useT();
  const queryClient = useQueryClient();
  const { data: offlineQueue } = useOfflineCheckinQueue();
  const pendingCheckin = useMemo(
    () => getPendingCheckin(offlineQueue ?? []),
    [offlineQueue],
  );
  const { data: upcoming, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: ['upcoming-shifts'],
    queryFn: () => api.get<ShiftAssignment[]>('/api/shifts/upcoming'),
  });
  const { data: activeCheckin, refetch: refetchCheckin } = useQuery({
    queryKey: ['active-checkin'],
    queryFn: () => api.get<Checkin | null>('/api/checkins/active'),
  });

  const invalidateAttendance = async () => {
    await queryClient.invalidateQueries({ queryKey: OFFLINE_CHECKIN_QUEUE_KEY });
    await refetchCheckin();
    await queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
  };

  const checkinMutation = useMutation({
    mutationFn: (id: string) => submitCheckin({ shiftAssignmentId: id }),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.mode === 'queued') {
        showSuccess(t('ops.dashboard.employee.savedOfflineTitle'), t('ops.dashboard.employee.checkinQueuedBody'));
      } else {
        showSuccess(t('ops.dashboard.employee.clockedInTitle'), t('ops.dashboard.employee.clockedInBody'));
      }
      void invalidateAttendance();
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(t('ops.dashboard.employee.checkinFailedTitle'), err.message);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (pendingCheckin) {
        return submitCheckout({ pendingCheckinLocalId: pendingCheckin.localId });
      }
      if (!activeCheckin?.id) throw new Error(t('ops.dashboard.employee.noActiveCheckinError'));
      return submitCheckout({ checkinId: activeCheckin.id });
    },
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.mode === 'queued') {
        showSuccess(t('ops.dashboard.employee.savedOfflineTitle'), t('ops.dashboard.employee.checkoutQueuedBody'));
      } else {
        showSuccess(t('ops.dashboard.employee.clockedOutTitle'), t('ops.dashboard.employee.clockedOutBody'));
      }
      void invalidateAttendance();
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(t('ops.dashboard.employee.checkoutFailedTitle'), err.message);
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
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: 100 }}
        accessibilityLabel={t('ops.dashboard.employee.loadingA11y')}
      >
        <View style={{ gap: spacing.lg }}>
          <HeroSkeleton />
          <MetricGridSkeleton />
          <CardListSkeleton count={2} />
        </View>
      </ScrollView>
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
          message={error instanceof Error ? error.message : t('ops.dashboard.employee.loadError')}
          onRetry={() => refetch()}
          testID="employee-dashboard-error"
        />
      </ScrollView>
    );
  }

  const nextShift = upcoming?.[0];
  const canCheckIn = nextShift?.shift
    ? Date.now() >= new Date(nextShift.shift.startTime).getTime() - 60 * 60 * 1000 &&
      Date.now() <= new Date(nextShift.shift.endTime).getTime()
    : false;

  const pendingShiftTitle =
    nextShift?.shift?.title ??
    upcoming?.find((assignment) => assignment.id === pendingCheckin?.shiftAssignmentId)?.shift?.title ??
    t('ops.dashboard.employee.onShiftFallback');

  const displayActive = activeCheckin ?? (pendingCheckin
    ? {
        checkinTime: pendingCheckin.clientTimestamp,
        shiftAssignment: { shift: { title: pendingShiftTitle } },
        pending: true as const,
      }
    : null);

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
            refetchCheckin();
            void queryClient.invalidateQueries({ queryKey: OFFLINE_CHECKIN_QUEUE_KEY });
          }}
          tintColor={colors.brand.primary}
        />
      }
      accessibilityLabel={t('ops.dashboard.employee.a11yLabel')}
    >
      <StaggerItem index={0}>
        {displayActive ? (
          <HighlightCard>
            <AccentBadge
              label={
                'pending' in displayActive && displayActive.pending
                  ? t('ops.dashboard.employee.pendingSyncBadge')
                  : t('ops.dashboard.employee.activeShiftBadge')
              }
              color={'pending' in displayActive && displayActive.pending ? colors.warning.base : colors.success.base}
              tint={'pending' in displayActive && displayActive.pending ? colors.warning.muted : colors.success.muted}
            />
            <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
              {displayActive.shiftAssignment?.shift?.title ?? t('ops.dashboard.employee.onShiftFallback')}
            </Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
              {t('ops.dashboard.employee.clockedInAt', { time: formatTime(displayActive.checkinTime) })}
            </Text>
            <View style={{ marginTop: spacing.xl }}>
              <PrimaryButton
                label={t('ops.dashboard.employee.clockOutButton')}
                onPress={() => checkoutMutation.mutate()}
                loading={checkoutMutation.isPending}
                icon={LogOut}
                testID="checkout-button"
              />
            </View>
          </HighlightCard>
        ) : nextShift?.shift ? (
          <HighlightCard>
            <AccentBadge label={t('ops.dashboard.employee.nextShiftBadge')} color={colors.brand.primaryLight} tint="rgba(130,102,255,0.16)" />
            <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
              {nextShift.shift.title}
            </Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
              {t('ops.dashboard.employee.shiftTimeRange', {
                date: formatDate(nextShift.shift.startTime),
                start: formatTime(nextShift.shift.startTime),
                end: formatTime(nextShift.shift.endTime),
              })}
            </Text>
            {canCheckIn ? (
              <View style={{ marginTop: spacing.xl }}>
                <PrimaryButton
                  label={t('ops.dashboard.employee.clockInButton')}
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
            title={t('ops.dashboard.employee.emptyTitle')}
            description={t('ops.dashboard.employee.emptyDescription')}
            color={colors.success.base}
          />
        )}
      </StaggerItem>

      <StaggerItem index={1} style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <MetricCard label={t('ops.dashboard.employee.upcomingLabel')} value={upcoming?.length ?? 0} icon={Calendar} color={colors.brand.primary} />
          <MetricCard
            label={t('ops.dashboard.employee.checkinStatusLabel')}
            value={displayActive ? t('ops.dashboard.employee.statusLive') : t('ops.dashboard.employee.statusIdle')}
            icon={Clock3}
            color={displayActive ? colors.success.base : colors.brand.gold}
          />
        </View>
      </StaggerItem>

      {history?.items && history.items.length > 0 ? (
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <StaggerItem index={2}>
            <Text style={{ ...typography.h3, color: colors.text.primary, marginBottom: spacing.xs }}>{t('ops.dashboard.employee.recentShiftsTitle')}</Text>
          </StaggerItem>
          {history.items.slice(0, 3).map((entry, index) => (
            <StaggerItem key={entry.id} index={3 + index}>
              <SurfaceCard>
                <Text style={{ ...typography.h4, color: colors.text.primary }}>
                  {entry.shiftAssignment?.shift?.title ?? t('ops.dashboard.employee.recordedShiftFallback')}
                </Text>
                <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: 4 }}>
                  {formatDate(entry.checkinTime)} · {formatTime(entry.checkinTime)}
                  {entry.checkoutTime ? ` - ${formatTime(entry.checkoutTime)}` : t('ops.dashboard.employee.inProgressSuffix')}
                </Text>
              </SurfaceCard>
            </StaggerItem>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
