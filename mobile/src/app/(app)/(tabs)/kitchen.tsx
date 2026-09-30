import { useCallback } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ChefHat } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, ErrorState, SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/resolver';
import { api } from '@/lib/api/api';
import { showError, showSuccess } from '@/lib/toast';
import { formatTime } from '@/lib/formatters';
import { colors, spacing, typography } from '@/theme';
import type { OrderItemStatus, OrderStatus, PosOrder, PosOrderItem } from '@/types/pos';

const KITCHEN_STATUSES = new Set(['OPEN', 'PREPARING', 'READY']);
const ACTIVE_ITEM_STATUSES = new Set(['PENDING', 'PREPARING', 'READY']);

const itemStatusKey: Record<OrderItemStatus, TranslationKey> = {
  PENDING: 'ops.kitchen.itemStatus.pending',
  PREPARING: 'ops.kitchen.itemStatus.preparing',
  READY: 'ops.kitchen.itemStatus.ready',
  SERVED: 'ops.kitchen.itemStatus.served',
  CANCELLED: 'ops.kitchen.itemStatus.cancelled',
};

const orderStatusKey: Record<OrderStatus, TranslationKey> = {
  OPEN: 'ops.kitchen.orderStatus.open',
  PREPARING: 'ops.kitchen.orderStatus.preparing',
  READY: 'ops.kitchen.orderStatus.ready',
  SERVED: 'ops.kitchen.orderStatus.served',
  PAID: 'ops.kitchen.orderStatus.paid',
  CANCELLED: 'ops.kitchen.orderStatus.cancelled',
};

function itemTone(status: OrderItemStatus) {
  if (status === 'READY') return colors.success.base;
  if (status === 'PREPARING') return colors.warning.base;
  return colors.brand.primary;
}

function KitchenItemRow({
  orderId,
  item,
  onUpdate,
  busy,
}: {
  orderId: string;
  item: PosOrderItem;
  onUpdate: (input: { orderId: string; itemId: string; status: OrderItemStatus }) => void;
  busy: boolean;
}) {
  const t = useT();
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border.default,
        paddingTop: spacing.md,
        marginTop: spacing.md,
        gap: spacing.sm,
      }}
      testID={`kitchen-item-${item.id}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <Text style={{ ...typography.h4, color: colors.text.primary, flex: 1 }}>
          {item.quantity}× {item.nameSnapshot}
        </Text>
        <Text style={{ ...typography.caption, color: itemTone(item.status) }}>{t(itemStatusKey[item.status])}</Text>
      </View>
      {item.notes ? (
        <Text style={{ ...typography.bodySmall, color: colors.text.secondary }}>{item.notes}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {item.status === 'PENDING' ? (
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={t('ops.kitchen.markPreparing')}
              onPress={() => onUpdate({ orderId, itemId: item.id, status: 'PREPARING' })}
              disabled={busy}
              testID={`kitchen-prepare-${item.id}`}
            />
          </View>
        ) : null}
        {item.status === 'PENDING' || item.status === 'PREPARING' ? (
          <View style={{ flex: 1 }}>
            <SecondaryButton
              label={t('ops.kitchen.markReady')}
              onPress={() => onUpdate({ orderId, itemId: item.id, status: 'READY' })}
              disabled={busy}
              testID={`kitchen-ready-${item.id}`}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function KitchenScreen() {
  const t = useT();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => api.get<PosOrder[]>('/api/orders'),
    refetchInterval: 5000,
  });

  const { mutate: mutateItemStatus, isPending: updatingItem } = useMutation({
    mutationFn: ({
      orderId,
      itemId,
      status,
    }: {
      orderId: string;
      itemId: string;
      status: OrderItemStatus;
    }) => api.patch<PosOrder>(`/api/orders/${orderId}/items/${itemId}`, { status }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess(t('ops.kitchen.updateSuccessTitle'), t('ops.kitchen.updateSuccessBody'));
      void queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(t('ops.kitchen.updateFailedTitle'), err.message);
    },
  });

  const handleUpdate = useCallback(
    (input: { orderId: string; itemId: string; status: OrderItemStatus }) => {
      mutateItemStatus(input);
    },
    [mutateItemStatus],
  );

  const orders = (data ?? [])
    .filter((order) => KITCHEN_STATUSES.has(order.status))
    .map((order) => ({
      ...order,
      items: order.items.filter((item) => ACTIVE_ITEM_STATUSES.has(item.status)),
    }))
    .filter((order) => order.items.length > 0);

  return (
    <ScreenScroll
      title={t('ops.kitchen.title')}
      subtitle={t('ops.kitchen.subtitle')}
      testID="kitchen-screen"
      refreshControl={
        <RefreshControl
          refreshing={Boolean(isFetching && !isLoading)}
          onRefresh={() => refetch()}
          tintColor={colors.brand.primary}
        />
      }
    >
      {isLoading ? (
        <View testID="kitchen-loading">
          <CardListSkeleton count={3} />
        </View>
      ) : null}

      {isError && !data ? (
        <ErrorState
          message={error instanceof Error ? error.message : t('ops.kitchen.loadError')}
          onRetry={() => refetch()}
          testID="kitchen-error"
        />
      ) : null}

      {!isLoading && !isError && orders.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title={t('ops.kitchen.emptyTitle')}
          description={t('ops.kitchen.emptyDescription')}
          color={colors.brand.gold}
          testID="kitchen-empty"
        />
      ) : null}

      <View style={{ gap: spacing.md }}>
        {orders.map((order, index) => (
          <StaggerItem key={order.id} index={index}>
            <SurfaceCard>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AccentBadge
                  label={t('ops.kitchen.tableBadge', { number: order.table?.number ?? '—' })}
                  color={colors.brand.gold}
                  tint={colors.warning.muted}
                />
                <Text style={{ ...typography.caption, color: colors.text.tertiary }}>
                  {formatTime(order.createdAt)}
                </Text>
              </View>
              <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: spacing.sm }}>
                {t('ops.kitchen.orderSummaryLine', {
                  status: t(orderStatusKey[order.status]),
                  items:
                    order.items.length === 1
                      ? t('ops.kitchen.itemCountOne', { count: order.items.length })
                      : t('ops.kitchen.itemCount', { count: order.items.length }),
                })}
              </Text>
              {order.items.map((item) => (
                <KitchenItemRow
                  key={item.id}
                  orderId={order.id}
                  item={item}
                  onUpdate={handleUpdate}
                  busy={updatingItem}
                />
              ))}
            </SurfaceCard>
          </StaggerItem>
        ))}
      </View>
    </ScreenScroll>
  );
}
