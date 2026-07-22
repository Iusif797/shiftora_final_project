import NetInfo from '@react-native-community/netinfo';
import { api, NetworkError } from '@/lib/api/api';
import { getLocationForCheckin } from '@/lib/checkin';
import {
  createUuid,
  enqueueOfflineItem,
  type OfflineCheckinItem,
  type OfflineCheckoutItem,
} from '@/lib/offline-checkin-queue';
import { flushOfflineCheckinQueue } from '@/lib/offline-checkin-sync';
import { uploadFile } from '@/lib/upload';
import type { Checkin } from '@/types/app';

export type CheckinSubmitResult =
  | { mode: 'online'; checkin: Checkin }
  | { mode: 'queued'; item: OfflineCheckinItem };

export type CheckoutSubmitResult =
  | { mode: 'online'; checkin: Checkin }
  | { mode: 'queued'; item: OfflineCheckoutItem };

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== false;
}

function buildQueuedCheckin(input: {
  localId: string;
  idempotencyKey: string;
  shiftAssignmentId: string;
  clientTimestamp: string;
  latitude?: number;
  longitude?: number;
  photoLocalUri?: string;
  notes?: string;
}): OfflineCheckinItem {
  return {
    type: 'checkin',
    localId: input.localId,
    idempotencyKey: input.idempotencyKey,
    shiftAssignmentId: input.shiftAssignmentId,
    clientTimestamp: input.clientTimestamp,
    latitude: input.latitude,
    longitude: input.longitude,
    photoLocalUri: input.photoLocalUri,
    notes: input.notes,
  };
}

export async function submitCheckin(input: {
  shiftAssignmentId: string;
  photoLocalUri?: string;
  photoUrl?: string;
  notes?: string;
}): Promise<CheckinSubmitResult> {
  const location = await getLocationForCheckin();
  const clientTimestamp = new Date().toISOString();
  const idempotencyKey = await createUuid();
  const localId = await createUuid();
  const online = await isOnline();

  if (!online) {
    const item = buildQueuedCheckin({
      localId,
      idempotencyKey,
      shiftAssignmentId: input.shiftAssignmentId,
      clientTimestamp,
      latitude: location?.latitude,
      longitude: location?.longitude,
      photoLocalUri: input.photoLocalUri,
      notes: input.notes,
    });
    await enqueueOfflineItem(item);
    return { mode: 'queued', item };
  }

  let photoUrl = input.photoUrl;
  if (!photoUrl && input.photoLocalUri) {
    try {
      const uploaded = await uploadFile(
        input.photoLocalUri,
        `checkin-${Date.now()}.jpg`,
        'image/jpeg',
      );
      photoUrl = uploaded.url;
    } catch (error) {
      if (error instanceof NetworkError) {
        const item = buildQueuedCheckin({
          localId,
          idempotencyKey,
          shiftAssignmentId: input.shiftAssignmentId,
          clientTimestamp,
          latitude: location?.latitude,
          longitude: location?.longitude,
          photoLocalUri: input.photoLocalUri,
          notes: input.notes,
        });
        await enqueueOfflineItem(item);
        return { mode: 'queued', item };
      }
      throw error;
    }
  }

  const body: Record<string, unknown> = {
    shiftAssignmentId: input.shiftAssignmentId,
    clientTimestamp,
    idempotencyKey,
    ...(location && { latitude: location.latitude, longitude: location.longitude }),
    ...(photoUrl && { photoUrl }),
    ...(input.notes && { notes: input.notes }),
  };

  try {
    const checkin = await api.post<Checkin>('/api/checkins/checkin', body);
    return { mode: 'online', checkin };
  } catch (error) {
    if (error instanceof NetworkError) {
      const item = buildQueuedCheckin({
        localId,
        idempotencyKey,
        shiftAssignmentId: input.shiftAssignmentId,
        clientTimestamp,
        latitude: location?.latitude,
        longitude: location?.longitude,
        photoLocalUri: input.photoLocalUri,
        notes: input.notes,
      });
      await enqueueOfflineItem(item);
      return { mode: 'queued', item };
    }
    throw error;
  }
}

export async function submitCheckout(input: {
  checkinId?: string;
  pendingCheckinLocalId?: string;
  notes?: string;
}): Promise<CheckoutSubmitResult> {
  const clientTimestamp = new Date().toISOString();
  const idempotencyKey = await createUuid();
  const localId = await createUuid();
  const online = await isOnline();

  let checkinId = input.checkinId;
  if (input.pendingCheckinLocalId && online) {
    const flushResult = await flushOfflineCheckinQueue();
    checkinId = flushResult.resolvedCheckinIds[input.pendingCheckinLocalId] ?? checkinId;
  }

  if (!online || (input.pendingCheckinLocalId && !checkinId)) {
    const item: OfflineCheckoutItem = {
      type: 'checkout',
      localId,
      idempotencyKey,
      clientTimestamp,
      checkinId,
      pendingCheckinLocalId: input.pendingCheckinLocalId,
      notes: input.notes,
    };
    await enqueueOfflineItem(item);
    return { mode: 'queued', item };
  }

  if (!checkinId) {
    throw new Error('checkinId required');
  }

  try {
    const checkin = await api.post<Checkin>('/api/checkins/checkout', {
      checkinId,
      clientTimestamp,
      idempotencyKey,
      ...(input.notes && { notes: input.notes }),
    });
    return { mode: 'online', checkin };
  } catch (error) {
    if (error instanceof NetworkError) {
      const item: OfflineCheckoutItem = {
        type: 'checkout',
        localId,
        idempotencyKey,
        clientTimestamp,
        checkinId,
        notes: input.notes,
      };
      await enqueueOfflineItem(item);
      return { mode: 'queued', item };
    }
    throw error;
  }
}
