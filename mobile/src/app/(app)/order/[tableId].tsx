import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showCancelOrder, setShowCancelOrder] = useState(false);

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

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.delete<PosOrder>(`/api/orders/${order!.id}/items/${itemId}`),
    onSuccess: invalidate,
    onError: (err) => showError('Could not remove item', err.message),
  });

  const cancelOrder = useMutation({
    mutationFn: () => api.post<PosOrder>(`/api/orders/${order!.id}/cancel`),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (err) => showError('Could not cancel order', err.message),
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
      if (result.url) await WebBrowser.openBrowserAsync(result.url);
      return api.post<{ paid: boolean; order?: PosOrder }>(`/api/orders/${order!.id}/confirm-payment`);
    },
    onSuccess: (result) => {
      invalidate();
      if (result.paid) {
        showSuccess('Paid', 'Stripe payment confirmed');
        router.back();
      } else {
        showError('Payment pending', 'Complete checkout, then try payment confirmation again.');
      }
    },
    onError: (err) => showError('Stripe failed', err.message),
  });

  const activeItems = useMemo(
    () => order?.items.filter((item) => item.status !== 'CANCELLED') ?? [],
    [order?.items],
  );

  const confirmPay = () => {
    setShowPaymentMethods(true);
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
      <Modal visible={showPaymentMethods} transparent animationType="fade" onRequestClose={() => setShowPaymentMethods(false)}>
        <Pressable
          onPress={() => setShowPaymentMethods(false)}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ backgroundColor: colors.bg.elevated, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, borderWidth: 1, borderColor: colors.border.default, padding: spacing.xl, paddingBottom: spacing.xxxl }}
          >
            <Text style={{ ...typography.h2, color: colors.text.primary }}>Choose payment method</Text>
            <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xl }}>
              Record how the guest paid ${order.totalAmount.toFixed(2)}.
            </Text>
            {[
              { label: 'Cash', action: () => payCash.mutate() },
              { label: 'Card terminal', action: () => payCard.mutate() },
              { label: 'Stripe checkout', action: () => payStripe.mutate() },
            ].map((method) => (
              <Pressable
                key={method.label}
                onPress={() => {
                  setShowPaymentMethods(false);
                  method.action();
                }}
                style={{ minHeight: 54, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.surface, marginBottom: spacing.sm }}
                accessibilityRole="button"
              >
                <Text style={{ ...typography.h4, color: colors.text.primary }}>{method.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowPaymentMethods(false)} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...typography.body, color: colors.text.secondary }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showCancelOrder} transparent animationType="fade" onRequestClose={() => setShowCancelOrder(false)}>
        <Pressable onPress={() => setShowCancelOrder(false)} style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.bg.elevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.danger.border, padding: spacing.xl }}>
            <Text style={{ ...typography.h2, color: colors.text.primary }}>Cancel this order?</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xl }}>The table will be released and this order can no longer be edited.</Text>
            <PrimaryButton label="Cancel order" onPress={() => { setShowCancelOrder(false); cancelOrder.mutate(); }} loading={cancelOrder.isPending} />
            <View style={{ marginTop: spacing.sm }}><SecondaryButton label="Keep order" onPress={() => setShowCancelOrder(false)} /></View>
          </Pressable>
        </Pressable>
      </Modal>
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
                <Pressable onPress={() => item.quantity === 1 ? removeItem.mutate(item.id) : updateQty.mutate({ itemId: item.id, quantity: item.quantity - 1 })} accessibilityLabel={item.quantity === 1 ? `Remove ${item.nameSnapshot}` : `Decrease ${item.nameSnapshot}`}>
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
        {order.paymentStatus !== 'PAID' ? (
          <View style={{ marginTop: spacing.sm }}>
            <SecondaryButton label="Cancel order" onPress={() => setShowCancelOrder(true)} disabled={cancelOrder.isPending} />
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
