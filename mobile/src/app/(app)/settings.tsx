import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Building2, ChevronLeft, LogOut, Shield } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { GeofenceMap } from '@/components/GeofenceMap';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, HighlightCard, SurfaceCard } from '@/components/cards';
import { DeleteAccountSection } from '@/components/delete-account';
import { api } from '@/lib/api/api';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession, useSession } from '@/lib/auth/use-session';
import { getInitials } from '@/lib/formatters';
import { showError, showSuccess } from '@/lib/toast';
import { colors, radius, roleAppearance, spacing, typography } from '@/theme';
import type { AppUser, Restaurant } from '@/types/app';

export default function Settings() {
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const queryClient = useQueryClient();
  const user = session?.user as AppUser | undefined;
  const role = roleAppearance[user?.role ?? 'employee'];
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [taxPercent, setTaxPercent] = useState('10');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRevision, setMapRevision] = useState(0);

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

  useEffect(() => {
    if (!restaurant) return;
    setRestaurantName(restaurant.name);
    setAddress(restaurant.address ?? '');
    setTimezone(restaurant.timezone ?? 'UTC');
    setTaxPercent(String(Math.round((restaurant.taxRate ?? 0.1) * 10000) / 100));
    setCoordinates(
      restaurant.latitude != null && restaurant.longitude != null
        ? { latitude: restaurant.latitude, longitude: restaurant.longitude }
        : null,
    );
  }, [restaurant]);

  const updateRestaurant = useMutation({
    mutationFn: async () => {
      if (!restaurant || !restaurantName.trim()) throw new Error('Restaurant name is required');
      const parsedTax = Number(taxPercent);
      if (!Number.isFinite(parsedTax) || parsedTax < 0 || parsedTax > 100) {
        throw new Error('Tax must be between 0 and 100 percent');
      }
      return api.put<Restaurant>(`/api/restaurants/${restaurant.id}`, {
        name: restaurantName.trim(),
        address: address.trim() || null,
        timezone: timezone.trim(),
        taxRate: parsedTax / 100,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['my-restaurant'], updated);
      showSuccess('Restaurant updated', 'Settings are now active');
    },
    onError: (error: Error) => showError('Could not save settings', error.message),
  });

  const useCurrentLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      showError('Location permission needed', 'Allow location access to set the check-in geofence.');
      return;
    }
    const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setCoordinates({ latitude: result.coords.latitude, longitude: result.coords.longitude });
    setMapRevision((value) => value + 1);
    showSuccess('Location captured', 'Save settings to activate the check-in geofence.');
  };

  const copyRestaurantId = async () => {
    if (!restaurant?.id) {
      return;
    }

    await Clipboard.setStringAsync(restaurant.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScreenScroll
      title="Settings"
      subtitle="Your profile, restaurant, and workspace security"
      leftSlot={
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <ChevronLeft color={colors.text.primary} size={24} strokeWidth={2} />
        </Pressable>
      }
    >
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
              {user?.role === 'owner' ? (
                <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
                  {[
                    { label: 'Restaurant name', value: restaurantName, onChangeText: setRestaurantName, keyboardType: 'default' as const },
                    { label: 'Address', value: address, onChangeText: setAddress, keyboardType: 'default' as const },
                    { label: 'Timezone', value: timezone, onChangeText: setTimezone, keyboardType: 'default' as const },
                    { label: 'Tax rate (%)', value: taxPercent, onChangeText: setTaxPercent, keyboardType: 'decimal-pad' as const },
                  ].map((field) => (
                    <View key={field.label}>
                      <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: spacing.sm }}>{field.label}</Text>
                      <TextInput
                        value={field.value}
                        onChangeText={field.onChangeText}
                        keyboardType={field.keyboardType}
                        placeholderTextColor={colors.text.disabled}
                        style={{ minHeight: 52, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.surface, color: colors.text.primary, paddingHorizontal: spacing.lg, fontSize: 16 }}
                      />
                    </View>
                  ))}
                  <Text style={{ ...typography.bodySmall, color: colors.text.secondary }}>
                    Check-in geofence: {coordinates ? 'configured (500 m radius)' : 'not configured'}
                  </Text>
                  {coordinates ? (
                    <GeofenceMap key={mapRevision} coordinates={coordinates} onChange={setCoordinates} />
                  ) : null}
                  <SecondaryButton label="Use current restaurant location" onPress={useCurrentLocation} />
                  {coordinates ? <SecondaryButton label="Disable geofence" onPress={() => setCoordinates(null)} /> : null}
                  <PrimaryButton label="Save restaurant settings" onPress={() => updateRestaurant.mutate()} loading={updateRestaurant.isPending} testID="save-restaurant-settings" />
                </View>
              ) : null}
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

        <View style={{ marginTop: spacing.xl }}>
          <DeleteAccountSection testID="delete-account-button-settings" />
        </View>

        <View style={{ marginTop: spacing.lg, flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
          <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
            <Text style={{ ...typography.bodySmall, color: colors.text.secondary, textDecorationLine: 'underline' }}>Privacy</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/terms')} accessibilityRole="link">
            <Text style={{ ...typography.bodySmall, color: colors.text.secondary, textDecorationLine: 'underline' }}>Terms</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          <Shield color={colors.brand.gold} size={14} strokeWidth={1.8} />
          <Text style={{ ...typography.caption, color: colors.text.tertiary }}>Shiftora v1.0 · Secure workspace</Text>
        </View>
      </View>
    </ScreenScroll>
  );
}
