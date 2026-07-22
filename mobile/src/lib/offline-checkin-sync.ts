import { api, NetworkError } from '@/lib/api/api';
import {
  loadOfflineQueue,
  removeOfflineItem,
  type OfflineCheckinItem,
  type OfflineCheckoutItem,
} from '@/lib/offline-checkin-queue';
import { uploadFile } from '@/lib/upload';
import type { Checkin } from '@/types/app';

export type FlushResult = {
  synced: number;
  failed: { localId: string; message: string }[];
  remaining: number;
  resolvedCheckinIds: Record<string, string>;
};

const PERMANENT_STATUS_HINTS = [
  'OUTSIDE_CHECKIN_WINDOW',
  'OUTSIDE_GEOFENCE',
  'INVALID_ASSIGNMENT_STATE',
  'INVALID_SHIFT_STATE',
  'ALREADY_CHECKED_IN',
  'INVALID_PHOTO',
  'LOCATION_REQUIRED',
  'Not assigned',
  'Not your checkin',
  'CLIENT_TIMESTAMP',
];

function isPermanentFailure(message: string): boolean {
  return PERMANENT_STATUS_HINTS.some((hint) => message.includes(hint));
}

async function flushCheckin(
  item: OfflineCheckinItem,
  resolvedCheckinIds: Map<string, string>,
): Promise<void> {
  let photoUrl: string | undefined;
  if (item.photoLocalUri) {
    const uploaded = await uploadFile(
      item.photoLocalUri,
      `checkin-${item.localId}.jpg`,
      'image/jpeg',
    );
    photoUrl = uploaded.url;
  }

  const checkin = await api.post<Checkin>('/api/checkins/checkin', {
    shiftAssignmentId: item.shiftAssignmentId,
    clientTimestamp: item.clientTimestamp,
    idempotencyKey: item.idempotencyKey,
    ...(item.latitude != null && { latitude: item.latitude }),
    ...(item.longitude != null && { longitude: item.longitude }),
    ...(photoUrl && { photoUrl }),
    ...(item.notes && { notes: item.notes }),
  });

  resolvedCheckinIds.set(item.localId, checkin.id);
}

async function flushCheckout(
  item: OfflineCheckoutItem,
  resolvedCheckinIds: Map<string, string>,
): Promise<void> {
  const checkinId =
    item.checkinId ??
    (item.pendingCheckinLocalId
      ? resolvedCheckinIds.get(item.pendingCheckinLocalId)
      : undefined);

  if (!checkinId) {
    throw new Error('Pending check-in is not synced yet');
  }

  await api.post<Checkin>('/api/checkins/checkout', {
    checkinId,
    clientTimestamp: item.clientTimestamp,
    idempotencyKey: item.idempotencyKey,
    ...(item.notes && { notes: item.notes }),
  });
}

export async function flushOfflineCheckinQueue(): Promise<FlushResult> {
  const queue = await loadOfflineQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: [], remaining: 0, resolvedCheckinIds: {} };
  }

  const resolvedCheckinIds = new Map<string, string>();
  let synced = 0;
  const failed: { localId: string; message: string }[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'checkin') {
        await flushCheckin(item, resolvedCheckinIds);
      } else {
        await flushCheckout(item, resolvedCheckinIds);
      }
      await removeOfflineItem(item.localId);
      synced += 1;
    } catch (error) {
      if (error instanceof NetworkError) {
        break;
      }

      const message = error instanceof Error ? error.message : 'Sync failed';
      if (message.includes('Pending check-in is not synced yet')) {
        break;
      }

      if (isPermanentFailure(message)) {
        await removeOfflineItem(item.localId);
        failed.push({ localId: item.localId, message });
        continue;
      }

      break;
    }
  }

  const remaining = (await loadOfflineQueue()).length;
  return {
    synced,
    failed,
    remaining,
    resolvedCheckinIds: Object.fromEntries(resolvedCheckinIds),
  };
}
