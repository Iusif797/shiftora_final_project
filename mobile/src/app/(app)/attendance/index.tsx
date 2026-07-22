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
import type { Checkin, ShiftAssignment } from '@/types/app';

export default function Attendance() {
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
        showSuccess('Saved offline', 'Check-in will sync when you are online');
      } else {
        showSuccess('Clocked in', 'Your shift has started');
      }
      void invalidateAttendance();
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError('Check-in failed', err.message);
    },
  });

  const handlePhotoCheckin = async () => {
    if (!nextShift?.shift) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Camera access', 'Camera permission is required for photo check-in.');
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
      if (!activeCheckin?.id) throw new Error('No active check-in');
      return submitCheckout({ checkinId: activeCheckin.id });
    },
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.mode === 'queued') {
        showSuccess('Saved offline', 'Checkout will sync when you are online');
      } else {
        showSuccess('Clocked out', 'Your shift has ended');
      }
      void invalidateAttendance();
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError('Checkout failed', err.message);
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
    'Current shift';

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
      title="Attendance"
      subtitle="Check in, check out, and review shift history"
      leftSlot={
        <ScalePressable onPress={() => router.back()} testID="attendance-back" hitSlop={12} scale={0.9} style={{ padding: 4 }}>
          <ChevronLeft color={colors.text.primary} size={24} strokeWidth={2} />
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
              ? '1 attendance action waiting to sync'
              : `${pendingCount} attendance actions waiting to sync`}
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
                : 'Could not load attendance data'
          }
          onRetry={onRetry}
          testID="attendance-error"
        />
      ) : displayActive ? (
        <HighlightCard>
          <AccentBadge
            label={'pending' in displayActive && displayActive.pending ? 'Pending sync' : 'Checked in'}
            color={'pending' in displayActive && displayActive.pending ? colors.warning.base : colors.success.base}
            tint={'pending' in displayActive && displayActive.pending ? colors.warning.muted : colors.success.muted}
          />
          <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
            {displayActive.shiftAssignment?.shift?.title ?? 'Current shift'}
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
            Started at {formatTime(displayActive.checkinTime)}
          </Text>
          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton
              label="Finish shift"
              onPress={() => checkoutMutation.mutate()}
              loading={checkoutMutation.isPending}
              icon={LogOut}
              testID="attendance-checkout-button"
            />
          </View>
        </HighlightCard>
      ) : canCheckIn && nextShift?.shift ? (
        <HighlightCard>
          <AccentBadge label="Ready to start" color={colors.brand.gold} tint={colors.warning.muted} />
          <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
            {nextShift.shift.title}
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
            {formatDate(nextShift.shift.startTime)} · {formatTime(nextShift.shift.startTime)}
          </Text>
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <PrimaryButton
              label="Start shift"
              onPress={() => checkinMutation.mutate({ shiftAssignmentId: nextShift.id })}
              loading={Boolean(checkinMutation.isPending && !photoCheckinAssignmentId)}
              icon={LogIn}
              testID="attendance-checkin-button"
            />
            <SecondaryButton
              label="Check in with photo"
              onPress={handlePhotoCheckin}
              disabled={checkinMutation.isPending}
              icon={Camera}
              testID="attendance-photo-checkin-button"
            />
            <SecondaryButton
              label="Scan QR"
              onPress={() => router.push('/attendance/scan-qr')}
              disabled={checkinMutation.isPending}
              testID="attendance-scan-qr-button"
            />
          </View>
        </HighlightCard>
      ) : (
        <EmptyState
          icon={Clock3}
          title="No active attendance"
          description="Your next shift will appear here when it's time to check in."
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
                  {entry.shiftAssignment?.shift?.title ?? 'Recorded shift'}
                </Text>
                <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: 4 }}>
                  {formatDate(entry.checkinTime)} · {formatTime(entry.checkinTime)}
                  {entry.checkoutTime ? ` - ${formatTime(entry.checkoutTime)}` : ' - in progress'}
                </Text>
              </SurfaceCard>
            </StaggerItem>
          ))
        ) : !loadingHistory ? (
          <EmptyState
            icon={Clock3}
            title="No attendance history"
            description="Your completed shifts will start building your attendance timeline here."
            color={colors.brand.gold}
          />
        ) : null}
      </View>
      ) : null}
    </ScreenScroll>
  );
}
