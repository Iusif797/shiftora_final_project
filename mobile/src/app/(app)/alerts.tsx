import { useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { AlertTriangle, X } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge, SecondaryButton } from '@/components/buttons';
import { EmptyState, SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { api } from '@/lib/api/api';
import { formatDate, formatTime } from '@/lib/formatters';
import { anomalyAppearance, colors, spacing, typography } from '@/theme';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import type { Anomaly, AnomalySeverity, AnomalyType } from '@/types/app';

const ANOMALY_TYPE_LABEL_KEYS: Record<AnomalyType, TranslationKey> = {
  LATE_ARRIVAL: 'schedule.alerts.type.lateArrival',
  MISSED_SHIFT: 'schedule.alerts.type.missedShift',
  EARLY_LEAVE: 'schedule.alerts.type.earlyLeave',
};

const ANOMALY_SEVERITY_LABEL_KEYS: Record<AnomalySeverity, TranslationKey> = {
  HIGH: 'schedule.alerts.severity.high',
  MEDIUM: 'schedule.alerts.severity.medium',
  LOW: 'schedule.alerts.severity.low',
};

export default function Alerts() {
  const t = useT();
  const queryClient = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data: anomalies, isLoading, isRefetching, refetch } = useQuery({
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
    <ScreenScroll
      title={t('schedule.alerts.title')}
      subtitle={t('schedule.alerts.subtitle')}
      leftSlot={
        <ScalePressable onPress={() => router.back()} testID="alerts-back" hitSlop={12} scale={0.9} style={{ padding: 4 }}>
          <X color={colors.text.secondary} size={22} strokeWidth={2} />
        </ScalePressable>
      }
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.brand.gold} />}
      testID="alerts-screen"
    >
      {isLoading ? (
        <View testID="alerts-loading">
          <CardListSkeleton count={3} />
        </View>
      ) : null}

      {anomalies?.length ? (
        <View style={{ gap: spacing.md }}>
          {anomalies.map((anomaly, index) => {
            const appearance = anomalyAppearance[anomaly.severity] ?? anomalyAppearance.MEDIUM;
            const isResolving = resolvingId === anomaly.id;

            return (
              <StaggerItem key={anomaly.id} index={index}>
                <SurfaceCard>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.h4, color: colors.text.primary }}>
                        {anomaly.employee?.user?.name ?? t('schedule.alerts.unknownEmployee')}
                      </Text>
                      <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: 4 }}>
                        {t(ANOMALY_TYPE_LABEL_KEYS[anomaly.type])}
                      </Text>
                      <Text style={{ ...typography.caption, color: colors.text.tertiary, marginTop: spacing.sm }}>
                        {formatDate(anomaly.detectedAt)} · {formatTime(anomaly.detectedAt)}
                      </Text>
                      {anomaly.shiftAssignment?.shift?.title ? (
                        <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: spacing.sm }}>
                          {t('schedule.alerts.shiftLabel', { title: anomaly.shiftAssignment.shift.title })}
                        </Text>
                      ) : null}
                    </View>
                    <AccentBadge label={t(ANOMALY_SEVERITY_LABEL_KEYS[anomaly.severity])} color={appearance.color} tint={appearance.tint} />
                  </View>
                  <View style={{ marginTop: spacing.lg }}>
                    <SecondaryButton
                      label={isResolving ? t('schedule.alerts.resolving') : t('schedule.alerts.markResolved')}
                      onPress={() => resolveMutation.mutate(anomaly.id)}
                      disabled={resolveMutation.isPending}
                      testID={`resolve-anomaly-${anomaly.id}`}
                    />
                  </View>
                </SurfaceCard>
              </StaggerItem>
            );
          })}
        </View>
      ) : !isLoading ? (
        <EmptyState
          icon={AlertTriangle}
          title={t('schedule.alerts.emptyTitle')}
          description={t('schedule.alerts.emptyDescription')}
          color={colors.success.base}
        />
      ) : null}
    </ScreenScroll>
  );
}
