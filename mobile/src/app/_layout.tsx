import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WifiOff } from 'lucide-react-native';
import { useSession } from '@/lib/auth/use-session';
import { useNetworkStatus } from '@/lib/use-network';
import { colors, typography, spacing } from '@/theme';
import '../../global.css';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 2 },
  },
});

function OfflineBanner() {
  const isConnected = useNetworkStatus();
  if (isConnected) return null;

  return (
    <View
      style={{
        backgroundColor: colors.danger.base,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
      }}
    >
      <WifiOff color="#FFFFFF" size={14} strokeWidth={2} />
      <Text style={{ ...typography.caption, color: '#FFFFFF' }}>No internet connection</Text>
    </View>
  );
}

function RootLayoutNav() {
  const { data: session, isLoading } = useSession();

  if (isLoading) return null;

  return (
    <View
      style={{ flex: 1, backgroundColor: '#070711' }}
      onLayout={() => SplashScreen.hideAsync()}
    >
      <StatusBar style="light" />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#070711' },
          animation: 'fade',
        }}
      >
        <Stack.Protected guard={!!session?.user}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!session?.user}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="verify-otp" />
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
