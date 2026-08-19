import { useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Copy, Plus, Trash2, UserPlus, X } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { api } from '@/lib/api/api';
import { showError, showSuccess } from '@/lib/toast';
import { colors, radius, spacing, typography } from '@/theme';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import type { Invitation, UserRole } from '@/types/app';

const INVITATIONS_KEY = ['invitations'] as const;

const ROLE_LABEL_KEYS: Record<UserRole, TranslationKey> = {
  owner: 'role.owner',
  manager: 'role.manager',
  employee: 'role.employee',
};

const INVITATION_STATUS_LABEL_KEYS: Record<Invitation['status'], TranslationKey> = {
  PENDING: 'schedule.invitations.status.pending',
  ACCEPTED: 'schedule.invitations.status.accepted',
  EXPIRED: 'schedule.invitations.status.expired',
  REVOKED: 'schedule.invitations.status.revoked',
};

function statusColor(status: Invitation['status']) {
  if (status === 'PENDING') return colors.brand.primary;
  if (status === 'ACCEPTED') return colors.success.base;
  return colors.text.tertiary;
}

export default function InvitationsScreen() {
  const t = useT();
  const queryClient = useQueryClient();
  const [createRole, setCreateRole] = useState<UserRole>('employee');

  const { data: invitations, isLoading, isRefetching, refetch } = useQuery({
    queryKey: INVITATIONS_KEY,
    queryFn: () => api.get<Invitation[]>('/api/invitations'),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post<Invitation>('/api/invitations', { role: createRole }),
    onSuccess: (invitation) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
      showSuccess(t('schedule.invitations.createdTitle'), t('schedule.invitations.createdBody', { code: invitation.code }));
    },
    onError: (err) => showError(t('schedule.invitations.createFailedTitle'), err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/invitations/${id}`),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
    },
    onError: (err) => showError(t('schedule.invitations.revokeFailedTitle'), err.message),
  });

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showSuccess(t('schedule.invitations.copiedTitle'), code);
  };

  const pending = invitations?.filter((item) => item.status === 'PENDING') ?? [];

  return (
    <ScreenScroll
      title={t('schedule.invitations.title')}
      subtitle={t('schedule.invitations.subtitle')}
      leftSlot={
        <ScalePressable onPress={() => router.back()} testID="invitations-back" scale={0.9}>
          <X color={colors.text.secondary} size={22} strokeWidth={2} />
        </ScalePressable>
      }
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.brand.gold} />}
      testID="invitations-screen"
    >
      <View style={{ gap: spacing.lg }}>
        <SurfaceCard>
          <Text style={{ ...typography.h4, color: colors.text.primary, marginBottom: spacing.md }}>{t('schedule.invitations.createHeading')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            {(['employee', 'manager'] as UserRole[]).map((role) => {
              const selected = createRole === role;
              return (
                <ScalePressable
                  key={role}
                  onPress={() => setCreateRole(role)}
                  scale={0.98}
                  style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: selected ? colors.brand.primaryLight : colors.border.default, backgroundColor: selected ? 'rgba(130,102,255,0.12)' : colors.bg.surface, alignItems: 'center' }}
                  testID={`invite-role-${role}`}
                >
                  <Text style={{ ...typography.body, color: selected ? colors.text.primary : colors.text.secondary, textTransform: 'capitalize' }}>{t(ROLE_LABEL_KEYS[role])}</Text>
                </ScalePressable>
              );
            })}
          </View>
          <PrimaryButton label={t('schedule.invitations.generateCode')} icon={Plus} onPress={() => createMutation.mutate()} loading={createMutation.isPending} testID="create-invite-button" />
        </SurfaceCard>

        {isLoading ? (
          <View testID="invitations-loading">
            <CardListSkeleton count={3} />
          </View>
        ) : null}

        {!isLoading && pending.length === 0 ? (
          <EmptyState icon={UserPlus} title={t('schedule.invitations.emptyTitle')} description={t('schedule.invitations.emptyDescription')} color={colors.brand.primary} testID="invitations-empty" />
        ) : null}

        {pending.map((invitation, index) => (
          <StaggerItem key={invitation.id} index={index}>
            <SurfaceCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.h3, color: colors.text.primary, letterSpacing: 2 }}>{invitation.code}</Text>
                  <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: spacing.xs, textTransform: 'capitalize' }}>
                    {t(ROLE_LABEL_KEYS[invitation.role])} · {t('schedule.invitations.expiresOn', { date: new Date(invitation.expiresAt).toLocaleDateString() })}
                  </Text>
                </View>
                <AccentBadge label={t(INVITATION_STATUS_LABEL_KEYS[invitation.status])} color={statusColor(invitation.status)} tint={`${statusColor(invitation.status)}22`} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <SecondaryButton label={t('schedule.invitations.copy')} icon={Copy} onPress={() => copyCode(invitation.code)} testID={`copy-invite-${invitation.id}`} />
                </View>
                <ScalePressable onPress={() => revokeMutation.mutate(invitation.id)} scale={0.9} style={{ width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.danger.border, backgroundColor: colors.danger.muted }} testID={`revoke-invite-${invitation.id}`}>
                  <Trash2 color={colors.danger.base} size={18} strokeWidth={2} />
                </ScalePressable>
              </View>
            </SurfaceCard>
          </StaggerItem>
        ))}
      </View>
    </ScreenScroll>
  );
}
