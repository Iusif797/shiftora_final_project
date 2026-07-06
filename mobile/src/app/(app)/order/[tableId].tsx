import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Minus, Plus, X } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { showError, showSuccess } from '@/lib/toast';
import { colors, radius, spacing, typography } from '@/theme';
import type { MenuCategory, PosOrder } from '@/types/pos';

export default function TableOrderScreen() {
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', tableId],
    queryFn: () => api.post<PosOrder>('/api/orders', { tableId }),
    enabled: Boolean(tableId),
  });

  const { data: categories } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => api.get<MenuCategory[]>('/api/menu/categories'),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['order', tableId] });
    queryClient.invalidateQueries({ queryKey: ['tables'] });
  }, [queryClient, tableId]);

  const addItem = useMutation({
    mutationFn: (menuItemId: string) =>
      api.post<PosOrder>(`/api/orders/${order!.id}/items`, { menuItemId, quantity: 1 }),
    onSuccess: invalidate,
    onError: (err) => showError('Could not add item', err.message),
  });

  const updateQty = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.patch<PosOrder>(`/api/orders/${order!.id}/items/${itemId}`, { quantity }),
    onSuccess: invalidate,
  });

  const payCash = useMutation({
    mutationFn: () => api.post<PosOrder>(`/api/orders/${order!.id}/pay`, { method: 'CASH' }),
    onSuccess: () => {
      showSuccess('Paid', 'Cash payment recorded');
      invalidate();
      router.back();
    },
    onError: (err) => showError('Payment failed', err.message),
  });

  const payCard = useMutation({
    mutationFn: () => api.post<PosOrder>(`/api/orders/${order!.id}/pay`, { method: 'CARD' }),
    onSuccess: () => {
      showSuccess('Paid', 'Card payment recorded');
      invalidate();
      router.back();
    },
    onError: (err) => showError('Payment failed', err.message),
  });

  const payStripe = useMutation({
    mutationFn: async () => {
      const result = await api.post<{ url: string }>(`/api/orders/${order!.id}/pay`, { method: 'STRIPE' });
      if (result.url) await Linking.openURL(result.url);
      return result;
    },
    onSuccess: async () => {
      await api.post(`/api/orders/${order!.id}/confirm-payment`);
      invalidate();
    },
    onError: (err) => showError('Stripe failed', err.message),
  });

  const activeItems = useMemo(
    () => order?.items.filter((item) => item.status !== 'CANCELLED') ?? [],
    [order?.items],
  );

  const confirmPay = () => {
    Alert.alert('Payment method', 'Choose how the guest paid', [
      { text: 'Cash', onPress: () => payCash.mutate() },
      { text: 'Card (terminal)', onPress: () => payCard.mutate() },
      { text: 'Stripe checkout', onPress: () => payStripe.mutate() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (isLoading || !order) {
    return (
      <ScreenScroll title="Order" subtitle="Loading..." leftSlot={<Pressable onPress={() => router.back()}><X color={colors.text.secondary} size={22} /></Pressable>}>
        <ActivityIndicator color={colors.brand.primary} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll
      title={`Table ${order.table?.number ?? ''}`}
      subtitle={`$${order.totalAmount.toFixed(2)} total`}
      leftSlot={<Pressable onPress={() => router.back()} testID="order-back"><X color={colors.text.secondary} size={22} /></Pressable>}
      testID="order-screen"
    >
      <SurfaceCard>
        <Text style={{ ...typography.h4, color: colors.text.primary, marginBottom: spacing.sm }}>Current check</Text>
        {activeItems.length === 0 ? (
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>No items yet — add from menu below.</Text>
        ) : (
          activeItems.map((item) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.text.primary }}>{item.nameSnapshot}</Text>
                <Text style={{ ...typography.caption, color: colors.text.tertiary }}>${item.priceSnapshot.toFixed(2)} each</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Pressable onPress={() => updateQty.mutate({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}>
                  <Minus color={colors.text.secondary} size={16} />
                </Pressable>
                <Text style={{ ...typography.body, color: colors.text.primary }}>{item.quantity}</Text>
                <Pressable onPress={() => updateQty.mutate({ itemId: item.id, quantity: item.quantity + 1 })}>
                  <Plus color={colors.text.secondary} size={16} />
                </Pressable>
              </View>
            </View>
          ))
        )}
        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>Subtotal ${order.subtotal.toFixed(2)}</Text>
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>Tax ${order.taxAmount.toFixed(2)}</Text>
          <Text style={{ ...typography.h3, color: colors.text.primary }}>Total ${order.totalAmount.toFixed(2)}</Text>
        </View>
        {order.paymentStatus !== 'PAID' && activeItems.length > 0 ? (
          <View style={{ marginTop: spacing.lg }}>
            <PrimaryButton label="Take payment" onPress={confirmPay} loading={payCash.isPending || payCard.isPending || payStripe.isPending} testID="pay-order-button" />
          </View>
        ) : null}
      </SurfaceCard>

      <Text style={{ ...typography.h3, color: colors.text.primary, marginTop: spacing.xl, marginBottom: spacing.md }}>Menu</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {categories?.map((category) => (
            <View key={category.id} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.default }}>
              <Text style={{ ...typography.caption, color: colors.text.secondary }}>{category.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ gap: spacing.md, paddingBottom: spacing.xxxl }}>
        {categories?.flatMap((category) =>
          (category.items ?? []).map((item) => (
            <Pressable key={item.id} onPress={() => addItem.mutate(item.id)} disabled={addItem.isPending || order.paymentStatus === 'PAID'} testID={`menu-item-${item.id}`}>
              <SurfaceCard>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={{ width: 64, height: 64, borderRadius: radius.md }} />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bg.surface, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ ...typography.caption, color: colors.text.tertiary }}>No photo</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.h4, color: colors.text.primary }}>{item.name}</Text>
                    {item.description ? <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>{item.description}</Text> : null}
                    <Text style={{ ...typography.body, color: colors.brand.gold, marginTop: spacing.sm }}>${item.price.toFixed(2)}</Text>
                  </View>
                  <Plus color={colors.brand.primary} size={20} />
                </View>
              </SurfaceCard>
            </Pressable>
          )),
        )}
      </View>
    </ScreenScroll>
  );
}
