import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { UserCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/app-shell';
import { AccentBadge } from '@/components/buttons';
import { enterFade } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { EmployeeDashboard, ManagerDashboard, OwnerDashboard } from '@/components/dashboard';
import { useSession } from '@/lib/auth/use-session';
import { getGreeting } from '@/lib/formatters';
import { colors, roleAppearance, spacing, typography } from '@/theme';
import type { AppUser } from '@/types/app';

export default function Dashboard() {
  const { data: session } = useSession();
  const user = session?.user as AppUser | undefined;
  const role = user?.role ?? 'employee';
  const roleStyle = roleAppearance[role];

  return (
    <AppBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: spacing.sm,
            paddingBottom: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.subtle,
          }}
          testID="dashboard-screen"
          accessibilityLabel="Dashboard"
        >
          <Animated.View
            entering={enterFade()}
            style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>{getGreeting()}</Text>
              <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: 4 }}>
                {user?.name?.split(' ')[0] ?? 'Welcome'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
              <ScalePressable
                onPress={() => router.push('/(app)/(tabs)/profile')}
                hitSlop={10}
                accessibilityLabel="Open profile"
                testID="dashboard-profile-button"
              >
                <UserCircle color={colors.text.secondary} size={28} strokeWidth={1.8} />
              </ScalePressable>
              <AccentBadge label={role} color={roleStyle.color} tint={`${roleStyle.color}18`} />
            </View>
          </Animated.View>
        </View>

        {role === 'employee' ? <EmployeeDashboard /> : null}
        {role === 'manager' ? <ManagerDashboard /> : null}
        {role === 'owner' ? <OwnerDashboard /> : null}
      </SafeAreaView>
    </AppBackground>
  );
}
