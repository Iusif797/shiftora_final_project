import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function AppLayout() {
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
