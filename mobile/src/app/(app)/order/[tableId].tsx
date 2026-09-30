import { useCallback, useMemo, useState } from 'react';
import { Image, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Minus, Plus, X } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { CardListSkeleton, HeroSkeleton } from '@/components/ui/skeletons';
import { useT } from '@/i18n/I18nProvider';
import { api } from '@/lib/api/api';
import { showError, showSuccess } from '@/lib/toast';
import { colors, radius, spacing, typography } from '@/theme';
import type { MenuCategory, PosOrder } from '@/types/pos';

export default function TableOrderScreen() {
  const t = useT();
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  const queryClient = useQueryClient();
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showCancelOrder, setShowCancelOrder] = useState(false);

  const { data: order, isLoading, isRefetching, refetch } = useQuery({
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
    queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
  }, [queryClient, tableId]);

  const addItem = useMutation({
    mutationFn: (menuItemId: string) =>
      api.post<PosOrder>(`/api/orders/${order!.id}/items`, { menuItemId, quantity: 1 }),
    onSuccess: invalidate,
    onError: (err) => showError(t('ops.order.addItemFailedTitle'), err.message),
  });

  const updateQty = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.patch<PosOrder>(`/api/orders/${order!.id}/items/${itemId}`, { quantity }),
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.delete<PosOrder>(`/api/orders/${order!.id}/items/${itemId}`),
    onSuccess: invalidate,
    onError: (err) => showError(t('ops.order.removeItemFailedTitle'), err.message),
  });

  const cancelOrder = useMutation({
    mutationFn: () => api.post<PosOrder>(`/api/orders/${order!.id}/cancel`),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (err) => showError(t('ops.order.cancelOrderFailedTitle'), err.message),
  });

  const payCash = useMutation({
    mutationFn: () => api.post<PosOrder>(`/api/orders/${order!.id}/pay`, { method: 'CASH' }),
    onSuccess: () => {
      showSuccess(t('ops.order.paidTitle'), t('ops.order.cashPaymentRecorded'));
      invalidate();
      router.back();
    },
    onError: (err) => showError(t('ops.order.paymentFailedTitle'), err.message),
  });

  const payCard = useMutation({
    mutationFn: () => api.post<PosOrder>(`/api/orders/${order!.id}/pay`, { method: 'CARD' }),
    onSuccess: () => {
      showSuccess(t('ops.order.paidTitle'), t('ops.order.cardPaymentRecorded'));
      invalidate();
      router.back();
    },
    onError: (err) => showError(t('ops.order.paymentFailedTitle'), err.message),
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
      <ScreenScroll title={t('ops.order.title')} subtitle={t('common.loading')} leftSlot={<ScalePressable onPress={() => router.back()} scale={0.9}><X color={colors.text.secondary} size={22} /></ScalePressable>}>
        <View style={{ gap: spacing.lg }}>
          <HeroSkeleton />
          <CardListSkeleton count={4} />
        </View>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll
      title={t('ops.floor.tableLabel', { number: order.table?.number ?? '' })}
      subtitle={t('ops.order.totalSubtitle', { total: order.totalAmount.toFixed(2) })}
      leftSlot={<ScalePressable onPress={() => router.back()} scale={0.9} testID="order-back"><X color={colors.text.secondary} size={22} /></ScalePressable>}
      testID="order-screen"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.brand.gold} />}
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
            <Text style={{ ...typography.h2, color: colors.text.primary }}>{t('ops.order.choosePaymentMethod')}</Text>
            <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xl }}>
              {t('ops.order.paymentRecordBody', { total: order.totalAmount.toFixed(2) })}
            </Text>
            {[
              { label: t('ops.order.paymentCash'), action: () => payCash.mutate() },
              { label: t('ops.order.paymentCardTerminal'), action: () => payCard.mutate() },
            ].map((method) => (
              <ScalePressable
                key={method.label}
                onPress={() => {
                  setShowPaymentMethods(false);
                  method.action();
                }}
                scale={0.98}
                style={{ minHeight: 54, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.surface, marginBottom: spacing.sm }}
                accessibilityRole="button"
              >
                <Text style={{ ...typography.h4, color: colors.text.primary }}>{method.label}</Text>
              </ScalePressable>
            ))}
            <ScalePressable onPress={() => setShowPaymentMethods(false)} scale={0.98} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...typography.body, color: colors.text.secondary }}>{t('common.cancel')}</Text>
            </ScalePressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showCancelOrder} transparent animationType="fade" onRequestClose={() => setShowCancelOrder(false)}>
        <Pressable onPress={() => setShowCancelOrder(false)} style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.bg.elevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.danger.border, padding: spacing.xl }}>
            <Text style={{ ...typography.h2, color: colors.text.primary }}>{t('ops.order.cancelConfirmTitle')}</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xl }}>{t('ops.order.cancelConfirmBody')}</Text>
            <PrimaryButton label={t('ops.order.cancelOrderButton')} onPress={() => { setShowCancelOrder(false); cancelOrder.mutate(); }} loading={cancelOrder.isPending} />
            <View style={{ marginTop: spacing.sm }}><SecondaryButton label={t('ops.order.keepOrderButton')} onPress={() => setShowCancelOrder(false)} /></View>
          </Pressable>
        </Pressable>
      </Modal>
      <SurfaceCard>
        <Text style={{ ...typography.h4, color: colors.text.primary, marginBottom: spacing.sm }}>{t('ops.order.currentCheckTitle')}</Text>
        {activeItems.length === 0 ? (
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>{t('ops.order.noItemsYet')}</Text>
        ) : (
          activeItems.map((item, index) => (
            <StaggerItem key={item.id} index={index}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: colors.text.primary }}>{item.nameSnapshot}</Text>
                  <Text style={{ ...typography.caption, color: colors.text.tertiary }}>
                    {t('ops.order.priceEach', { price: `$${item.priceSnapshot.toFixed(2)}` })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <ScalePressable
                    onPress={() => item.quantity === 1 ? removeItem.mutate(item.id) : updateQty.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                    scale={0.9}
                    accessibilityLabel={
                      item.quantity === 1
                        ? t('ops.order.removeItemA11y', { name: item.nameSnapshot })
                        : t('ops.order.decreaseItemA11y', { name: item.nameSnapshot })
                    }
                  >
                    <Minus color={colors.text.secondary} size={16} />
                  </ScalePressable>
                  <Text style={{ ...typography.body, color: colors.text.primary }}>{item.quantity}</Text>
                  <ScalePressable onPress={() => updateQty.mutate({ itemId: item.id, quantity: item.quantity + 1 })} scale={0.9} accessibilityLabel={t('ops.order.increaseItemA11y', { name: item.nameSnapshot })}>
                    <Plus color={colors.text.secondary} size={16} />
                  </ScalePressable>
                </View>
              </View>
            </StaggerItem>
          ))
        )}
        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>
            {t('ops.order.subtotalLine', { amount: `$${order.subtotal.toFixed(2)}` })}
          </Text>
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>
            {t('ops.order.taxLine', { amount: `$${order.taxAmount.toFixed(2)}` })}
          </Text>
          <Text style={{ ...typography.h3, color: colors.text.primary }}>
            {t('ops.order.totalLine', { amount: `$${order.totalAmount.toFixed(2)}` })}
          </Text>
        </View>
        {order.paymentStatus !== 'PAID' && activeItems.length > 0 ? (
          <View style={{ marginTop: spacing.lg }}>
            <PrimaryButton label={t('ops.order.takePaymentButton')} onPress={confirmPay} loading={payCash.isPending || payCard.isPending} testID="pay-order-button" />
          </View>
        ) : null}
        {order.paymentStatus !== 'PAID' ? (
          <View style={{ marginTop: spacing.sm }}>
            <SecondaryButton label={t('ops.order.cancelOrderButton')} onPress={() => setShowCancelOrder(true)} disabled={cancelOrder.isPending} />
          </View>
        ) : null}
      </SurfaceCard>

      <Text style={{ ...typography.h3, color: colors.text.primary, marginTop: spacing.xl, marginBottom: spacing.md }}>{t('ops.order.menuHeading')}</Text>
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
        {categories?.flatMap((category) => category.items ?? []).map((item, index) => (
          <StaggerItem key={item.id} index={index}>
            <ScalePressable onPress={() => addItem.mutate(item.id)} disabled={addItem.isPending || order.paymentStatus === 'PAID'} scale={0.98} testID={`menu-item-${item.id}`}>
              <SurfaceCard>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={{ width: 64, height: 64, borderRadius: radius.md }} />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bg.surface, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ ...typography.caption, color: colors.text.tertiary }}>{t('ops.menu.noPhoto')}</Text>
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
            </ScalePressable>
          </StaggerItem>
        ))}
      </View>
    </ScreenScroll>
  );
}
