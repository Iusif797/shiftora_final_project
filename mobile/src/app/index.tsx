import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useSession } from '@/lib/auth/use-session';
import { colors } from '@/theme';
import type { AppUser } from '@/types/app';

export default function Index() {
  const { data: session, isLoading } = useSession();
  const user = session?.user as AppUser | undefined;

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.bg.base }} testID="index-loading" />;
  }

  if (!user) {
    return <Redirect href="/welcome" />;
  }

  if (!user.restaurantId) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}
