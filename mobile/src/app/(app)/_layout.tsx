import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { api } from '@/lib/api/api';
import { useOfflineCheckinSync } from '@/hooks/use-offline-checkin-sync';
import { registerPushToken } from '@/lib/notifications';
import { colors } from '@/theme';

export default function AppLayout() {
  useOfflineCheckinSync();
  useEffect(() => {
    registerPushToken((token) => api.post('/api/users/push-token', { token })).catch(() => {});
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg.base },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="settings"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="alerts"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="order/[tableId]" />
      <Stack.Screen
        name="menu-manage"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="tables-manage"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="attendance" />
      <Stack.Screen
        name="invitations"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}
