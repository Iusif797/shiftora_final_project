import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { AlertTriangle } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge, SecondaryButton } from '@/components/buttons';
import { EmptyState, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { formatDate, formatTime } from '@/lib/formatters';
import { anomalyAppearance, colors, spacing, typography } from '@/theme';
import type { Anomaly } from '@/types/app';

export default function Alerts() {
  const queryClient = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data: anomalies, isLoading } = useQuery({
    queryKey: ['anomalies'],
    queryFn: () => api.get<Anomaly[]>('/api/anomalies'),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => {
      setResolvingId(id);
      return api.put<Anomaly>(`/api/anomalies/${id}/resolve`, {});
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
    },
    onSettled: () => setResolvingId(null),
  });

  return (
    <ScreenScroll title="Alerts" subtitle="Late arrivals, missed shifts, and staffing anomalies" testID="alerts-screen">
      {isLoading ? <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.xxxl }} /> : null}

      {anomalies?.length ? (
        <View style={{ gap: spacing.md }}>
          {anomalies.map((anomaly) => {
            const appearance = anomalyAppearance[anomaly.severity] ?? anomalyAppearance.MEDIUM;
            const isResolving = resolvingId === anomaly.id;

            return (
              <SurfaceCard key={anomaly.id}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.h4, color: colors.text.primary }}>
                      {anomaly.employee?.user?.name ?? 'Unknown employee'}
                    </Text>
                    <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: 4 }}>
                      {anomaly.type.replace(/_/g, ' ')}
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.text.tertiary, marginTop: spacing.sm }}>
                      {formatDate(anomaly.detectedAt)} · {formatTime(anomaly.detectedAt)}
                    </Text>
                    {anomaly.shiftAssignment?.shift?.title ? (
                      <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: spacing.sm }}>
                        Shift: {anomaly.shiftAssignment.shift.title}
                      </Text>
                    ) : null}
                  </View>
                  <AccentBadge label={anomaly.severity} color={appearance.color} tint={appearance.tint} />
                </View>
                <View style={{ marginTop: spacing.lg }}>
                  <SecondaryButton
                    label={isResolving ? 'Resolving...' : 'Mark as resolved'}
                    onPress={() => resolveMutation.mutate(anomaly.id)}
                    disabled={resolveMutation.isPending}
                    testID={`resolve-anomaly-${anomaly.id}`}
                  />
                </View>
              </SurfaceCard>
            );
          })}
        </View>
      ) : !isLoading ? (
        <EmptyState
          icon={AlertTriangle}
          title="No active alerts"
          description="Everything looks stable right now. New anomalies will surface here automatically."
          color={colors.success.base}
        />
      ) : null}
    </ScreenScroll>
  );
}
