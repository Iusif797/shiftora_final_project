import { useMemo, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronLeft, Clock3, LogIn, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, ErrorState, HighlightCard, SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { CardListSkeleton, HeroSkeleton } from '@/components/ui/skeletons';
import { api } from '@/lib/api/api';
import {
  OFFLINE_CHECKIN_QUEUE_KEY,
  useOfflineCheckinQueue,
} from '@/hooks/use-offline-checkin-sync';
import { getPendingCheckin } from '@/lib/offline-checkin-queue';
import { submitCheckin, submitCheckout } from '@/lib/submit-checkin';
import { showAlert, showError, showSuccess } from '@/lib/toast';
import { formatDate, formatTime } from '@/lib/formatters';
import { colors, spacing, typography } from '@/theme';
import { useI18n } from '@/i18n/I18nProvider';
import { mirrorIcon } from '@/i18n/rtl-styles';
import type { Checkin, ShiftAssignment } from '@/types/app';

export default function Attendance() {
  const { t, isRTL } = useI18n();
  const queryClient = useQueryClient();
  const [photoCheckinAssignmentId, setPhotoCheckinAssignmentId] = useState<string | null>(null);
  const { data: offlineQueue } = useOfflineCheckinQueue();
  const pendingCheckin = useMemo(
    () => getPendingCheckin(offlineQueue ?? []),
    [offlineQueue],
  );
  const pendingCount = offlineQueue?.length ?? 0;

  const { data: activeCheckin, isLoading: loadingActive, isRefetching: refetchingActive, isError: errorActive, error: errorActiveObj, refetch: refetchActive } = useQuery({
    queryKey: ['active-checkin'],
    queryFn: () => api.get<Checkin | null>('/api/checkins/active'),
  });
  const { data: history, isLoading: loadingHistory, isRefetching: refetchingHistory, isError: errorHistory, error: errorHistoryObj, refetch: refetchHistory } = useQuery({
    queryKey: ['checkin-history'],
    queryFn: () => api.get<{ items: Checkin[] }>('/api/checkins/history?limit=20'),
  });
  const { data: upcoming } = useQuery({
    queryKey: ['upcoming-shifts'],
    queryFn: () => api.get<ShiftAssignment[]>('/api/shifts/upcoming'),
  });

  const invalidateAttendance = async () => {
    await queryClient.invalidateQueries({ queryKey: OFFLINE_CHECKIN_QUEUE_KEY });
    await refetchActive();
    await refetchHistory();
    await queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
  };

  const checkinMutation = useMutation({
    mutationFn: ({ shiftAssignmentId, photoLocalUri }: { shiftAssignmentId: string; photoLocalUri?: string }) =>
      submitCheckin({ shiftAssignmentId, photoLocalUri }),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhotoCheckinAssignmentId(null);
      if (result.mode === 'queued') {
        showSuccess(t('schedule.attendance.checkinSavedOfflineTitle'), t('schedule.attendance.checkinSavedOfflineBody'));
      } else {
        showSuccess(t('schedule.attendance.clockedInTitle'), t('schedule.attendance.clockedInBody'));
      }
      void invalidateAttendance();
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(t('schedule.attendance.checkinFailedTitle'), err.message);
    },
  });

  const handlePhotoCheckin = async () => {
    if (!nextShift?.shift) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert(t('schedule.attendance.cameraAccessTitle'), t('schedule.attendance.cameraAccessBody'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoCheckinAssignmentId(nextShift.id);
    checkinMutation.mutate({
      shiftAssignmentId: nextShift.id,
      photoLocalUri: result.assets[0].uri,
    });
  };

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (pendingCheckin) {
        return submitCheckout({ pendingCheckinLocalId: pendingCheckin.localId });
      }
      if (!activeCheckin?.id) throw new Error(t('schedule.attendance.noActiveCheckinError'));
      return submitCheckout({ checkinId: activeCheckin.id });
    },
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.mode === 'queued') {
        showSuccess(t('schedule.attendance.checkoutSavedOfflineTitle'), t('schedule.attendance.checkoutSavedOfflineBody'));
      } else {
        showSuccess(t('schedule.attendance.clockedOutTitle'), t('schedule.attendance.clockedOutBody'));
      }
      void invalidateAttendance();
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(t('schedule.attendance.checkoutFailedTitle'), err.message);
    },
  });

  const nextShift = upcoming?.[0];
  const canCheckIn = nextShift?.shift
    ? Date.now() >= new Date(nextShift.shift.startTime).getTime() - 60 * 60 * 1000 &&
      Date.now() <= new Date(nextShift.shift.endTime).getTime()
    : false;

  const pendingShiftTitle =
    nextShift?.shift?.title ??
    upcoming?.find((assignment) => assignment.id === pendingCheckin?.shiftAssignmentId)?.shift?.title ??
    t('schedule.attendance.currentShiftFallback');

  const displayActive = activeCheckin ?? (pendingCheckin
    ? {
        id: `pending:${pendingCheckin.localId}`,
        checkinTime: pendingCheckin.clientTimestamp,
        shiftAssignment: { shift: { title: pendingShiftTitle } },
        pending: true as const,
      }
    : null);

  const onRetry = () => {
    refetchActive();
    refetchHistory();
  };

  return (
    <ScreenScroll
      title={t('schedule.attendance.title')}
      subtitle={t('schedule.attendance.subtitle')}
      leftSlot={
        <ScalePressable onPress={() => router.back()} testID="attendance-back" hitSlop={12} scale={0.9} style={{ padding: 4 }}>
          <View style={mirrorIcon(isRTL)}>
            <ChevronLeft color={colors.text.primary} size={24} strokeWidth={2} />
          </View>
        </ScalePressable>
      }
      refreshControl={<RefreshControl refreshing={refetchingActive || refetchingHistory} onRefresh={onRetry} tintColor={colors.brand.gold} />}
      testID="attendance-screen"
    >
      {pendingCount > 0 ? (
        <View testID="attendance-pending-banner">
        <SurfaceCard>
          <Text style={{ ...typography.body, color: colors.warning.base }}>
            {pendingCount === 1
              ? t('schedule.attendance.pendingSyncOne')
              : t('schedule.attendance.pendingSyncMany', { count: pendingCount })}
          </Text>
        </SurfaceCard>
        </View>
      ) : null}

      {loadingActive || loadingHistory ? (
        <View testID="attendance-loading" style={{ gap: spacing.xl }}>
          <HeroSkeleton />
          <CardListSkeleton count={3} />
        </View>
      ) : (errorActive || errorHistory) && !displayActive && !history?.items?.length ? (
        <ErrorState
          message={
            errorActiveObj instanceof Error
              ? errorActiveObj.message
              : errorHistoryObj instanceof Error
                ? errorHistoryObj.message
                : t('schedule.attendance.loadError')
          }
          onRetry={onRetry}
          testID="attendance-error"
        />
      ) : displayActive ? (
        <HighlightCard>
          <AccentBadge
            label={'pending' in displayActive && displayActive.pending ? t('schedule.attendance.pendingSyncBadge') : t('schedule.attendance.checkedInBadge')}
            color={'pending' in displayActive && displayActive.pending ? colors.warning.base : colors.success.base}
            tint={'pending' in displayActive && displayActive.pending ? colors.warning.muted : colors.success.muted}
          />
          <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
            {displayActive.shiftAssignment?.shift?.title ?? t('schedule.attendance.currentShiftFallback')}
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
            {t('schedule.attendance.startedAt', { time: formatTime(displayActive.checkinTime) })}
          </Text>
          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton
              label={t('schedule.attendance.finishShift')}
              onPress={() => checkoutMutation.mutate()}
              loading={checkoutMutation.isPending}
              icon={LogOut}
              testID="attendance-checkout-button"
            />
          </View>
        </HighlightCard>
      ) : canCheckIn && nextShift?.shift ? (
        <HighlightCard>
          <AccentBadge label={t('schedule.attendance.readyToStart')} color={colors.brand.gold} tint={colors.warning.muted} />
          <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
            {nextShift.shift.title}
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
            {formatDate(nextShift.shift.startTime)} · {formatTime(nextShift.shift.startTime)}
          </Text>
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <PrimaryButton
              label={t('schedule.attendance.startShift')}
              onPress={() => checkinMutation.mutate({ shiftAssignmentId: nextShift.id })}
              loading={Boolean(checkinMutation.isPending && !photoCheckinAssignmentId)}
              icon={LogIn}
              testID="attendance-checkin-button"
            />
            <SecondaryButton
              label={t('schedule.attendance.checkInWithPhoto')}
              onPress={handlePhotoCheckin}
              disabled={checkinMutation.isPending}
              icon={Camera}
              testID="attendance-photo-checkin-button"
            />
            <SecondaryButton
              label={t('schedule.attendance.scanQr')}
              onPress={() => router.push('/attendance/scan-qr')}
              disabled={checkinMutation.isPending}
              testID="attendance-scan-qr-button"
            />
          </View>
        </HighlightCard>
      ) : (
        <EmptyState
          icon={Clock3}
          title={t('schedule.attendance.emptyTitle')}
          description={t('schedule.attendance.emptyDescription')}
          color={colors.brand.primary}
        />
      )}

      {!((errorActive || errorHistory) && !displayActive && !history?.items?.length) ? (
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {history?.items?.length ? (
          history.items.slice(0, 10).map((entry, index) => (
            <StaggerItem key={entry.id} index={index}>
              <SurfaceCard>
                <Text style={{ ...typography.h4, color: colors.text.primary }}>
                  {entry.shiftAssignment?.shift?.title ?? t('schedule.attendance.recordedShiftFallback')}
                </Text>
                <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: 4 }}>
                  {formatDate(entry.checkinTime)} · {formatTime(entry.checkinTime)}
                  {entry.checkoutTime ? ` - ${formatTime(entry.checkoutTime)}` : ` - ${t('schedule.attendance.inProgress')}`}
                </Text>
              </SurfaceCard>
            </StaggerItem>
          ))
        ) : !loadingHistory ? (
          <EmptyState
            icon={Clock3}
            title={t('schedule.attendance.historyEmptyTitle')}
            description={t('schedule.attendance.historyEmptyDescription')}
            color={colors.brand.gold}
          />
        ) : null}
      </View>
      ) : null}
    </ScreenScroll>
  );
}
