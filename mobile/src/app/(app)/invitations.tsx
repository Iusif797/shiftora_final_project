import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Copy, Plus, Trash2, UserPlus, X } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { showError, showSuccess } from '@/lib/toast';
import { colors, radius, spacing, typography } from '@/theme';
import type { Invitation, UserRole } from '@/types/app';

const INVITATIONS_KEY = ['invitations'] as const;

function statusColor(status: Invitation['status']) {
  if (status === 'PENDING') return colors.brand.primary;
  if (status === 'ACCEPTED') return colors.success.base;
  return colors.text.tertiary;
}

export default function InvitationsScreen() {
  const queryClient = useQueryClient();
  const [createRole, setCreateRole] = useState<UserRole>('employee');

  const { data: invitations, isLoading } = useQuery({
    queryKey: INVITATIONS_KEY,
    queryFn: () => api.get<Invitation[]>('/api/invitations'),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post<Invitation>('/api/invitations', { role: createRole }),
    onSuccess: (invitation) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
      showSuccess('Invite created', `Code: ${invitation.code}`);
    },
    onError: (err) => showError('Failed to create invite', err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/invitations/${id}`),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
    },
    onError: (err) => showError('Failed to revoke', err.message),
  });

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showSuccess('Copied', code);
  };

  const pending = invitations?.filter((item) => item.status === 'PENDING') ?? [];

  return (
    <ScreenScroll
      title="Invitations"
      subtitle="Share codes with your team"
      leftSlot={
        <Pressable onPress={() => router.back()} testID="invitations-back">
          <X color={colors.text.secondary} size={22} strokeWidth={2} />
        </Pressable>
      }
      testID="invitations-screen"
    >
      <View style={{ gap: spacing.lg }}>
        <SurfaceCard>
          <Text style={{ ...typography.h4, color: colors.text.primary, marginBottom: spacing.md }}>Create invite code</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            {(['employee', 'manager'] as UserRole[]).map((role) => {
              const selected = createRole === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => setCreateRole(role)}
                  style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: selected ? colors.brand.primaryLight : colors.border.default, backgroundColor: selected ? 'rgba(130,102,255,0.12)' : colors.bg.surface, alignItems: 'center' }}
                  testID={`invite-role-${role}`}
                >
                  <Text style={{ ...typography.body, color: selected ? colors.text.primary : colors.text.secondary, textTransform: 'capitalize' }}>{role}</Text>
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton label="Generate code" icon={Plus} onPress={() => createMutation.mutate()} loading={createMutation.isPending} testID="create-invite-button" />
        </SurfaceCard>

        {isLoading ? <ActivityIndicator color={colors.brand.primary} testID="invitations-loading" /> : null}

        {!isLoading && pending.length === 0 ? (
          <EmptyState icon={UserPlus} title="No active invites" description="Generate a code and share it with staff during onboarding." color={colors.brand.primary} testID="invitations-empty" />
        ) : null}

        {pending.map((invitation) => (
          <SurfaceCard key={invitation.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.h3, color: colors.text.primary, letterSpacing: 2 }}>{invitation.code}</Text>
                <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: spacing.xs, textTransform: 'capitalize' }}>
                  {invitation.role} · expires {new Date(invitation.expiresAt).toLocaleDateString()}
                </Text>
              </View>
              <AccentBadge label={invitation.status.toLowerCase()} color={statusColor(invitation.status)} tint={`${statusColor(invitation.status)}22`} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Copy" icon={Copy} onPress={() => copyCode(invitation.code)} testID={`copy-invite-${invitation.id}`} />
              </View>
              <Pressable onPress={() => revokeMutation.mutate(invitation.id)} style={{ width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.danger.border, backgroundColor: colors.danger.muted }} testID={`revoke-invite-${invitation.id}`}>
                <Trash2 color={colors.danger.base} size={18} strokeWidth={2} />
              </Pressable>
            </View>
          </SurfaceCard>
        ))}
      </View>
    </ScreenScroll>
  );
}
