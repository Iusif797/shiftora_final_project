import { Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
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
      showSuccess('Account deleted', 'Your account and its data have been permanently removed.');
    },
    onError: (error: Error) => showError('Could not delete account', error.message),
  });

  const confirm = () => {
    const details =
      user?.role === 'owner'
        ? 'Your account will be deleted permanently. Because you own this restaurant, the restaurant and all of its data — shifts, check-ins, menu, tables, orders and invitations — are deleted with it. Employees keep their own accounts but lose access to this workspace.'
        : 'Your account will be deleted permanently, together with your check-ins, shift assignments and profile data. This cannot be undone.';

    Alert.alert('Delete account?', details, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Delete account permanently?',
            'This is the final confirmation. The account cannot be restored afterwards.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete permanently',
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
        accessibilityLabel="Delete account"
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
          {deleteAccount.isPending ? 'Deleting account…' : 'Delete account'}
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
        Deletes your account and its data permanently. This cannot be undone.
      </Text>
    </View>
  );
}
