import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { api } from '@/lib/api/api';
import { registerPushToken } from '@/lib/notifications';
import { colors } from '@/theme';

export default function AppLayout() {
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
      <Stack.Screen name="settings" />
      <Stack.Screen name="alerts" />
      <Stack.Screen name="attendance" />
    </Stack>
  );
}
