import * as Sentry from '@sentry/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { ErrorBoundary } from '@/components/error-boundary';
import { useSession } from '@/lib/auth/use-session';
import { useNetworkStatus } from '@/lib/use-network';
import { colors, typography, spacing } from '@/theme';
import type { AppUser } from '@/types/app';
import '../../global.css';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
  });
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
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
  const user = session?.user as AppUser | undefined;
  const needsOnboarding = !!user && !user.restaurantId;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#070711' }}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View
      className="dark"
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
        <Stack.Protected guard={!!user && !needsOnboarding}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={needsOnboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default dsn ? Sentry.wrap(RootLayout) : RootLayout;
