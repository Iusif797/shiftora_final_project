import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/lib/use-network';
import { countPendingItems, loadOfflineQueue } from '@/lib/offline-checkin-queue';
import { flushOfflineCheckinQueue } from '@/lib/offline-checkin-sync';
import { showError, showSuccess } from '@/lib/toast';
import { useT } from '@/i18n/I18nProvider';

export const OFFLINE_CHECKIN_QUEUE_KEY = ['offline-checkin-queue'] as const;

export function useOfflineCheckinQueue() {
  return useQuery({
    queryKey: OFFLINE_CHECKIN_QUEUE_KEY,
    queryFn: loadOfflineQueue,
    staleTime: 0,
  });
}

export function useOfflineCheckinSync() {
  const t = useT();
  const isConnected = useNetworkStatus();
  const queryClient = useQueryClient();
  const flushingRef = useRef(false);

  useEffect(() => {
    if (!isConnected || flushingRef.current) return;

    let cancelled = false;

    const run = async () => {
      flushingRef.current = true;
      try {
        const result = await flushOfflineCheckinQueue();
        if (cancelled) return;

        await queryClient.invalidateQueries({ queryKey: OFFLINE_CHECKIN_QUEUE_KEY });
        if (result.synced > 0) {
          await queryClient.invalidateQueries({ queryKey: ['active-checkin'] });
          await queryClient.invalidateQueries({ queryKey: ['checkin-history'] });
          await queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
          showSuccess(
            t('schedule.attendance.syncedTitle'),
            result.synced === 1
              ? t('schedule.attendance.syncedOne')
              : t('schedule.attendance.syncedMany', { count: result.synced }),
          );
        }
        if (result.failed.length > 0) {
          showError(t('schedule.attendance.someFailedTitle'), result.failed[0]?.message ?? t('schedule.checkin.syncFailedFallback'));
        }
      } finally {
        flushingRef.current = false;
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isConnected, queryClient, t]);
}

export function usePendingCheckinCount() {
  const { data } = useOfflineCheckinQueue();
  return countPendingItems(data ?? []);
}
