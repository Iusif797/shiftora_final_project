import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api/api';
import { getLocationForCheckin } from '@/lib/checkin';
import { colors, spacing, typography } from '@/theme';
import type { Checkin } from '@/types/app';

function parseShiftAssignmentId(data: string): string | null {
  const trimmed = data.trim();
  if (trimmed.startsWith('shiftora:checkin:')) {
    return trimmed.slice('shiftora:checkin:'.length) || null;
  }
  if (/^[a-z0-9]{20,}$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export default function ScanQR() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performCheckin = useCallback(async (shiftAssignmentId: string, qrPayload: string) => {
    const location = await getLocationForCheckin();
    const body: Record<string, unknown> = {
      shiftAssignmentId,
      qrPayload,
      ...(location && { latitude: location.latitude, longitude: location.longitude }),
    };
    return api.post<Checkin>('/api/checkins/checkin', body);
  }, []);

  const checkinMutation = useMutation({
    mutationFn: ({ shiftAssignmentId, qrPayload }: { shiftAssignmentId: string; qrPayload: string }) =>
      performCheckin(shiftAssignmentId, qrPayload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['active-checkin'] });
      queryClient.invalidateQueries({ queryKey: ['checkin-history'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
      router.back();
    },
    onError: (err: Error) => {
      setError(err.message || 'Check-in failed');
      setScanned(false);
    },
  });

  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned || checkinMutation.isPending) return;
      const assignmentId = parseShiftAssignmentId(data);
      if (!assignmentId) {
        setError('Invalid QR code');
        return;
      }
      setScanned(true);
      setError(null);
      checkinMutation.mutate({ shiftAssignmentId: assignmentId, qrPayload: data });
    },
    [scanned, checkinMutation]
  );

  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.message}>Requesting camera access...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.message}>Camera permission is required to scan QR codes.</Text>
        <Pressable onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={[styles.button, styles.backButton]}>
          <ChevronLeft color={colors.text.primary} size={20} />
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.md,
            paddingHorizontal: spacing.xl,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={colors.text.primary} size={24} />
        </Pressable>
        <Text style={styles.title}>Scan check-in QR</Text>
      </View>
      {error ? (
        <View style={[styles.errorBanner, { top: insets.top + 60 }]}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}
      {checkinMutation.isPending ? (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Checking in...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'transparent',
    marginTop: spacing.lg,
  },
  buttonText: {
    ...typography.body,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    padding: spacing.sm,
  },
  title: {
    ...typography.h4,
    color: colors.text.primary,
  },
  errorBanner: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.danger.muted,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger.border,
  },
  errorText: {
    ...typography.body,
    color: colors.danger.base,
  },
  dismissText: {
    ...typography.bodySmall,
    color: colors.danger.base,
    marginTop: spacing.sm,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    ...typography.h4,
    color: colors.text.primary,
  },
});
