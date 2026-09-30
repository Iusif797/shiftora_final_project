import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/app-shell';
import { AccentBadge } from '@/components/buttons';
import { HeaderActions } from '@/components/header-actions';
import { enterFade } from '@/components/ui/motion';
import { EmployeeDashboard, ManagerDashboard, OwnerDashboard } from '@/components/dashboard';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/resolver';
import { useSession } from '@/lib/auth/use-session';
import { getGreeting } from '@/lib/formatters';
import { colors, roleAppearance, spacing, typography } from '@/theme';
import type { AppUser } from '@/types/app';

const ROLE_LABEL_KEYS: Record<'owner' | 'manager' | 'employee', TranslationKey> = {
  owner: 'role.owner',
  manager: 'role.manager',
  employee: 'role.employee',
};

export default function Dashboard() {
  const { data: session } = useSession();
  const t = useT();
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
          accessibilityLabel={t('tabs.dashboard')}
        >
          <Animated.View
            entering={enterFade()}
            style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>{getGreeting()}</Text>
              {/* The person's name used to sit here. It is data, not an
                  affordance, and it ended up in every screenshot and screen
                  share — it now lives inside the account sheet instead. */}
              <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: 4 }}>
                {t('tabs.dashboard')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
              <HeaderActions />
              <AccentBadge
                label={t(ROLE_LABEL_KEYS[role])}
                color={roleStyle.color}
                tint={`${roleStyle.color}18`}
              />
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
