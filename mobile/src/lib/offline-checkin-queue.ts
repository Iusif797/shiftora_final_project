import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const QUEUE_KEY = 'shiftora:offline-checkin-queue:v1';

export type OfflineCheckinItem = {
  type: 'checkin';
  localId: string;
  idempotencyKey: string;
  shiftAssignmentId: string;
  clientTimestamp: string;
  latitude?: number;
  longitude?: number;
  photoLocalUri?: string;
  notes?: string;
};

export type OfflineCheckoutItem = {
  type: 'checkout';
  localId: string;
  idempotencyKey: string;
  clientTimestamp: string;
  checkinId?: string;
  pendingCheckinLocalId?: string;
  notes?: string;
};

export type OfflineQueueItem = OfflineCheckinItem | OfflineCheckoutItem;

export async function createUuid(): Promise<string> {
  return Crypto.randomUUID();
}

export async function loadOfflineQueue(): Promise<OfflineQueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveOfflineQueue(items: OfflineQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueOfflineItem(item: OfflineQueueItem): Promise<OfflineQueueItem[]> {
  const queue = await loadOfflineQueue();
  queue.push(item);
  await saveOfflineQueue(queue);
  return queue;
}

export async function removeOfflineItem(localId: string): Promise<OfflineQueueItem[]> {
  const queue = await loadOfflineQueue();
  const next = queue.filter((item) => item.localId !== localId);
  await saveOfflineQueue(next);
  return next;
}

export function getPendingCheckin(queue: OfflineQueueItem[]): OfflineCheckinItem | null {
  const checkedOutLocalIds = new Set(
    queue
      .filter((item): item is OfflineCheckoutItem => item.type === 'checkout')
      .map((item) => item.pendingCheckinLocalId)
      .filter((id): id is string => Boolean(id)),
  );
  return (
    queue.find(
      (item): item is OfflineCheckinItem =>
        item.type === 'checkin' && !checkedOutLocalIds.has(item.localId),
    ) ?? null
  );
}

export function countPendingItems(queue: OfflineQueueItem[]): number {
  return queue.length;
}
