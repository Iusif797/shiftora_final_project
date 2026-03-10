import { Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Building2, LogOut, Shield } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, HighlightCard, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession, useSession } from '@/lib/auth/use-session';
import { getInitials } from '@/lib/formatters';
import { colors, radius, roleAppearance, spacing, typography } from '@/theme';
import type { AppUser, Restaurant } from '@/types/app';

export default function Settings() {
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const user = session?.user as AppUser | undefined;
  const role = roleAppearance[user?.role ?? 'employee'];

  const { data: restaurant } = useQuery({
    queryKey: ['my-restaurant'],
    queryFn: () => api.get<Restaurant | null>('/api/restaurants/my'),
    enabled: user != null,
  });

  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await invalidateSession();
    },
  });

  const copyRestaurantId = async () => {
    if (!restaurant?.id) {
      return;
    }

    await Clipboard.setStringAsync(restaurant.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScreenScroll title="Settings" subtitle="Your profile, restaurant, and workspace security">
      <View testID="settings-screen">
        <HighlightCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.xl,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${role.color}18`,
                borderWidth: 1,
                borderColor: `${role.color}38`,
              }}
            >
              <Text style={{ ...typography.h3, color: role.color }}>{getInitials(user?.name ?? '?')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.h3, color: colors.text.primary }}>{user?.name}</Text>
              <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>{user?.email}</Text>
              <View style={{ marginTop: spacing.md }}>
                <AccentBadge label={user?.role ?? 'employee'} color={role.color} tint={`${role.color}18`} />
              </View>
            </View>
          </View>
        </HighlightCard>

        <View style={{ marginTop: spacing.xl }}>
          {restaurant ? (
            <SurfaceCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
                <Building2 color={colors.brand.gold} size={18} strokeWidth={1.8} />
                <Text style={{ ...typography.h4, color: colors.text.primary }}>Restaurant</Text>
              </View>
              <Text style={{ ...typography.h2, color: colors.text.primary }}>{restaurant.name}</Text>
              {restaurant.address ? (
                <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: spacing.sm }}>
                  {restaurant.address}
                </Text>
              ) : null}
              <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: spacing.lg }}>
                {restaurant.id}
              </Text>
              <View style={{ marginTop: spacing.xl }}>
                <SecondaryButton label="Copy restaurant ID" onPress={copyRestaurantId} testID="copy-restaurant-id" />
              </View>
            </SurfaceCard>
          ) : (
            <EmptyState
              icon={Building2}
              title="No restaurant linked"
              description="Ask your owner for the restaurant ID to join the workspace."
              color={colors.brand.gold}
            />
          )}
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton
            label="Sign out"
            onPress={() => signOutMutation.mutate()}
            loading={signOutMutation.isPending}
            icon={LogOut}
            testID="sign-out-button"
          />
        </View>

        <View style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          <Shield color={colors.brand.gold} size={14} strokeWidth={1.8} />
          <Text style={{ ...typography.caption, color: colors.text.tertiary }}>Shiftora v1.0 · Secure workspace</Text>
        </View>
      </View>
    </ScreenScroll>
  );
}
