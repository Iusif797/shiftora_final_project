import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Clock3, LogIn, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, HighlightCard, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { getLocationForCheckin } from '@/lib/checkin';
import { uploadFile } from '@/lib/upload';
import { formatDate, formatTime } from '@/lib/formatters';
import { colors, spacing, typography } from '@/theme';
import type { Checkin, ShiftAssignment } from '@/types/app';

export default function Attendance() {
  const queryClient = useQueryClient();
  const [photoCheckinAssignmentId, setPhotoCheckinAssignmentId] = useState<string | null>(null);
  const { data: activeCheckin, isLoading: loadingActive, refetch: refetchActive } = useQuery({
    queryKey: ['active-checkin'],
    queryFn: () => api.get<Checkin | null>('/api/checkins/active'),
  });
  const { data: history, isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['checkin-history'],
    queryFn: () => api.get<Checkin[]>('/api/checkins/history'),
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
      setPhotoCheckinAssignmentId(null);
      refetchActive();
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
    },
  });

  const handlePhotoCheckin = async () => {
    if (!nextShift?.shift) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera access', 'Camera permission is required for photo check-in.');
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
      Alert.alert('Upload failed', 'Could not upload photo. Try again.');
    }
  };

  const checkoutMutation = useMutation({
    mutationFn: (checkinId: string) => api.post<Checkin>('/api/checkins/checkout', { checkinId }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchActive();
      refetchHistory();
    },
  });

  const nextShift = upcoming?.[0];
  const canCheckIn = nextShift?.shift
    ? Math.abs(new Date(nextShift.shift.startTime).getTime() - Date.now()) <= 60 * 60 * 1000
    : false;

  return (
    <ScreenScroll title="Attendance" subtitle="Check in, check out, and review shift history" testID="attendance-screen">
      {loadingActive || loadingHistory ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.xxxl }} />
      ) : null}

      {activeCheckin ? (
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
              loading={checkinMutation.isPending && !photoCheckinAssignmentId}
              icon={LogIn}
              testID="attendance-checkin-button"
            />
            <SecondaryButton
              label="Check in with photo"
              onPress={handlePhotoCheckin}
              loading={checkinMutation.isPending && photoCheckinAssignmentId === nextShift.id}
              icon={Camera}
              testID="attendance-photo-checkin-button"
            />
            <SecondaryButton
              label="Scan QR"
              onPress={() => router.push('/attendance/scan-qr')}
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

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {history?.length ? (
          history.slice(0, 10).map((entry) => (
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
    </ScreenScroll>
  );
}
