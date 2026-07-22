import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/lib/use-network';
import { countPendingItems, loadOfflineQueue } from '@/lib/offline-checkin-queue';
import { flushOfflineCheckinQueue } from '@/lib/offline-checkin-sync';
import { showError, showSuccess } from '@/lib/toast';

export const OFFLINE_CHECKIN_QUEUE_KEY = ['offline-checkin-queue'] as const;

export function useOfflineCheckinQueue() {
  return useQuery({
    queryKey: OFFLINE_CHECKIN_QUEUE_KEY,
    queryFn: loadOfflineQueue,
    staleTime: 0,
  });
}

export function useOfflineCheckinSync() {
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
            'Attendance synced',
            result.synced === 1
              ? '1 pending check-in was uploaded'
              : `${result.synced} pending items were uploaded`,
          );
        }
        if (result.failed.length > 0) {
          showError('Some check-ins failed', result.failed[0]?.message ?? 'Sync failed');
        }
      } finally {
        flushingRef.current = false;
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isConnected, queryClient]);
}

export function usePendingCheckinCount() {
  const { data } = useOfflineCheckinQueue();
  return countPendingItems(data ?? []);
}
