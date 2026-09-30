import { Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useT } from '@/i18n/I18nProvider';
import { api } from '@/lib/api/api';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession, useSession } from '@/lib/auth/use-session';
import { showError, showSuccess } from '@/lib/toast';
import { colors, radius, spacing, typography } from '@/theme';
import type { AppUser } from '@/types/app';

/**
 * Удаление аккаунта прямо из приложения — требование App Store Review
 * Guideline 5.1.1(v): раз приложение даёт завести учётную запись, оно обязано
 * дать её и удалить. Никаких писем в поддержку и никакой «временной
 * деактивации»: два подтверждения здесь же, дальше сервер удаляет аккаунт
 * вместе с данными (DELETE /api/users/me).
 */
export function DeleteAccountSection({ testID = 'delete-account-button' }: { testID?: string }) {
  const t = useT();
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const queryClient = useQueryClient();
  const user = session?.user as AppUser | undefined;

  const deleteAccount = useMutation({
    mutationFn: () => api.delete<{ deleted: boolean }>('/api/users/me'),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await authClient.signOut().catch(() => undefined);
      queryClient.clear();
      await invalidateSession();
      router.replace('/welcome');
      showSuccess(t('account.delete.toast.successTitle'), t('account.delete.toast.successBody'));
    },
    onError: (error: Error) => showError(t('account.delete.toast.errorTitle'), error.message),
  });

  const confirm = () => {
    const details =
      user?.role === 'owner'
        ? t('account.delete.confirmBodyOwner')
        : t('account.delete.confirmBodyEmployee');

    Alert.alert(t('account.delete.confirmTitle'), details, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            t('account.delete.finalConfirmTitle'),
            t('account.delete.finalConfirmBody'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('account.delete.deletePermanently'),
                style: 'destructive',
                onPress: () => deleteAccount.mutate(),
              },
            ],
          ),
      },
    ]);
  };

  return (
    <View>
      <Pressable
        onPress={confirm}
        disabled={deleteAccount.isPending}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={t('account.delete.button')}
        style={{
          minHeight: 52,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.danger.border,
          backgroundColor: colors.danger.muted,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          opacity: deleteAccount.isPending ? 0.5 : 1,
        }}
      >
        <Trash2 color={colors.danger.base} size={18} strokeWidth={2} />
        <Text style={{ ...typography.h4, color: colors.danger.base }}>
          {deleteAccount.isPending ? t('account.delete.deleting') : t('account.delete.button')}
        </Text>
      </Pressable>
      <Text
        style={{
          ...typography.bodySmall,
          color: colors.text.tertiary,
          textAlign: 'center',
          marginTop: spacing.sm,
        }}
      >
        {t('account.delete.footerNote')}
      </Text>
    </View>
  );
}
