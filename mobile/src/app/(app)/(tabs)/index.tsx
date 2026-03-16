import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/app-shell';
import { AccentBadge } from '@/components/buttons';
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>{getGreeting()}</Text>
              <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: 4 }}>
                {user?.name?.split(' ')[0] ?? 'Welcome'}
              </Text>
            </View>
            <AccentBadge label={role} color={roleStyle.color} tint={`${roleStyle.color}18`} />
          </View>
        </View>

        {role === 'employee' ? <EmployeeDashboard /> : null}
        {role === 'manager' ? <ManagerDashboard /> : null}
        {role === 'owner' ? <OwnerDashboard /> : null}
      </SafeAreaView>
    </AppBackground>
  );
}
