import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Clock3, LogIn, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, ErrorState, HighlightCard, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { getLocationForCheckin } from '@/lib/checkin';
import { showAlert, showError, showSuccess } from '@/lib/toast';
import { uploadFile } from '@/lib/upload';
import { formatDate, formatTime } from '@/lib/formatters';
import { colors, spacing, typography } from '@/theme';
import type { Checkin, ShiftAssignment } from '@/types/app';

export default function Attendance() {
  const queryClient = useQueryClient();
  const [photoCheckinAssignmentId, setPhotoCheckinAssignmentId] = useState<string | null>(null);
  const { data: activeCheckin, isLoading: loadingActive, isError: errorActive, error: errorActiveObj, refetch: refetchActive } = useQuery({
    queryKey: ['active-checkin'],
    queryFn: () => api.get<Checkin | null>('/api/checkins/active'),
  });
  const { data: history, isLoading: loadingHistory, isError: errorHistory, error: errorHistoryObj, refetch: refetchHistory } = useQuery({
    queryKey: ['checkin-history'],
    queryFn: () => api.get<{ items: Checkin[] }>('/api/checkins/history?limit=20'),
  });
  const { data: upcoming } = useQuery({
    queryKey: ['upcoming-shifts'],
    queryFn: () => api.get<ShiftAssignment[]>('/api/shifts/upcoming'),
  });

  const performCheckin = async (shiftAssignmentId: string, opts?: { photoUrl?: string; qrPayload?: string }) => {
    const location = await getLocationForCheckin();
    const body: Record<string, unknown> = {
      shiftAssignmentId,
      ...(location && { latitude: location.latitude, longitude: location.longitude }),
      ...(opts?.photoUrl && { photoUrl: opts.photoUrl }),
      ...(opts?.qrPayload && { qrPayload: opts.qrPayload }),
    };
    return api.post<Checkin>('/api/checkins/checkin', body);
  };

  const checkinMutation = useMutation({
    mutationFn: ({ shiftAssignmentId, photoUrl, qrPayload }: { shiftAssignmentId: string; photoUrl?: string; qrPayload?: string }) =>
      performCheckin(shiftAssignmentId, { photoUrl, qrPayload }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess('Clocked in', 'Your shift has started');
      setPhotoCheckinAssignmentId(null);
      refetchActive();
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
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
    try {
      const asset = await uploadFile(
        result.assets[0].uri,
        `checkin-${Date.now()}.jpg`,
        'image/jpeg'
      );
      checkinMutation.mutate({ shiftAssignmentId: nextShift.id, photoUrl: asset.url });
    } catch {
      setPhotoCheckinAssignmentId(null);
      showAlert('Upload failed', 'Could not upload photo. Try again.');
    }
  };

  const checkoutMutation = useMutation({
    mutationFn: (checkinId: string) => api.post<Checkin>('/api/checkins/checkout', { checkinId }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess('Clocked out', 'Your shift has ended');
      refetchActive();
      refetchHistory();
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError('Checkout failed', err.message);
    },
  });

  const nextShift = upcoming?.[0];
  const canCheckIn = nextShift?.shift
    ? Math.abs(new Date(nextShift.shift.startTime).getTime() - Date.now()) <= 60 * 60 * 1000
    : false;

  const onRetry = () => {
    refetchActive();
    refetchHistory();
  };

  return (
    <ScreenScroll title="Attendance" subtitle="Check in, check out, and review shift history" testID="attendance-screen">
      {loadingActive || loadingHistory ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.xxxl }} />
      ) : null}

      {(errorActive || errorHistory) && !activeCheckin && !history?.items?.length ? (
        <ErrorState
          message={
            errorActiveObj instanceof Error
              ? errorActiveObj.message
              : errorHistoryObj instanceof Error
                ? errorHistoryObj.message
                : 'Не удалось загрузить данные'
          }
          onRetry={onRetry}
          testID="attendance-error"
        />
      ) : activeCheckin ? (
        <HighlightCard>
          <AccentBadge label="Checked in" color={colors.success.base} tint={colors.success.muted} />
          <Text style={{ ...typography.h2, color: colors.text.primary, marginTop: spacing.lg }}>
            {activeCheckin.shiftAssignment?.shift?.title ?? 'Current shift'}
          </Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>
            Started at {formatTime(activeCheckin.checkinTime)}
          </Text>
          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton
              label="Finish shift"
              onPress={() => checkoutMutation.mutate(activeCheckin.id)}
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

      {!((errorActive || errorHistory) && !activeCheckin && !history?.items?.length) ? (
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {history?.items?.length ? (
          history.items.slice(0, 10).map((entry) => (
            <SurfaceCard key={entry.id}>
              <Text style={{ ...typography.h4, color: colors.text.primary }}>
                {entry.shiftAssignment?.shift?.title ?? 'Recorded shift'}
              </Text>
              <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: 4 }}>
                {formatDate(entry.checkinTime)} · {formatTime(entry.checkinTime)}
                {entry.checkoutTime ? ` - ${formatTime(entry.checkoutTime)}` : ' - in progress'}
              </Text>
            </SurfaceCard>
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
