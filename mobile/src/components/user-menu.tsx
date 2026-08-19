import { useCallback, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LogOut, Settings as SettingsIcon, UserCircle, UserRound } from 'lucide-react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { ScalePressable } from '@/components/ui/pressable';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import type { LucideIcon } from 'lucide-react-native';

/**
 * The account control is an ICON. The person's name is not printed in the
 * header any more — a name is not an affordance, it is data, and it leaked
 * into every screenshot. The name now lives inside this sheet, where it
 * identifies the account you are about to sign out of.
 */
export function UserMenu({
  name,
  testID = 'user-menu',
}: {
  name?: string;
  testID?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const invalidateSession = useInvalidateSession();

  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOpen(false);
      await invalidateSession();
    },
  });

  const go = useCallback((path: string) => {
    setOpen(false);
    router.push(path as Parameters<typeof router.push>[0]);
  }, []);

  return (
    <>
      <ScalePressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        testID={testID}
        accessibilityLabel={t('a11y.user.button')}
      >
        <UserCircle color={colors.text.secondary} size={28} strokeWidth={1.8} />
      </ScalePressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        testID="user-menu-sheet"
      >
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityLabel={t('a11y.close')}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={() => undefined}
            style={{
              backgroundColor: colors.bg.card,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border.default,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xxl,
              paddingHorizontal: spacing.lg,
              gap: spacing.xs,
              ...shadows.card,
            }}
          >
            <Text style={{ ...typography.h3, color: colors.text.primary }}>
              {t('user.menuTitle')}
            </Text>
            {name ? (
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.text.tertiary,
                  marginBottom: spacing.sm,
                }}
                numberOfLines={1}
              >
                {name}
              </Text>
            ) : (
              <View style={{ marginBottom: spacing.sm }} />
            )}

            <MenuRow
              icon={UserRound}
              label={t('user.profile')}
              testID="user-menu-profile"
              onPress={() => go('/(app)/(tabs)/profile')}
            />
            <MenuRow
              icon={SettingsIcon}
              label={t('user.settings')}
              testID="user-menu-settings"
              onPress={() => go('/(app)/settings')}
            />
            <MenuRow
              icon={LogOut}
              label={t('user.signOut')}
              tone={colors.danger.base}
              testID="user-menu-sign-out"
              disabled={signOutMutation.isPending}
              onPress={() => signOutMutation.mutate()}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onPress,
  testID,
  tone,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  testID: string;
  tone?: string;
  disabled?: boolean;
}) {
  const color = tone ?? colors.text.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon color={color} size={20} strokeWidth={2} />
      <Text style={{ ...typography.h4, color }}>{label}</Text>
    </Pressable>
  );
}
