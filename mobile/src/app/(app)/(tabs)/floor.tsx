import { useEffect } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Grid3x3, LayoutGrid, UtensilsCrossed } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { EmptyState, SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { TileGridSkeleton } from '@/components/ui/skeletons';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import type { AppUser } from '@/types/app';
import type { RestaurantTable } from '@/types/pos';

const tableColors = {
  FREE: colors.success.base,
  OCCUPIED: colors.danger.base,
  RESERVED: colors.warning.base,
} as const;

function useOccupiedPulse(active: boolean) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 900, reduceMotion: ReduceMotion.System }),
      ),
      -1,
    );
    return () => cancelAnimation(pulse);
  }, [active, pulse]);

  return useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
}

function TableTile({ table }: { table: RestaurantTable }) {
  const activeOrder = table.orders?.[0];
  const tone = tableColors[table.status] ?? colors.text.tertiary;
  const isOccupied = table.status === 'OCCUPIED';
  const pulseStyle = useOccupiedPulse(isOccupied);

  return (
    <ScalePressable onPress={() => router.push(`/order/${table.id}` as Href)} testID={`table-tile-${table.number}`}>
      <SurfaceCard>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Animated.View
            style={[
              {
                width: 56,
                height: 56,
                borderRadius: radius.lg,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${tone}20`,
                borderWidth: 1,
                borderColor: `${tone}40`,
              },
              isOccupied ? shadows.glow(tone) : null,
              pulseStyle,
            ]}
          >
            <Text style={{ ...typography.h2, color: tone }}>{table.number}</Text>
          </Animated.View>
          <Text style={{ ...typography.body, color: colors.text.primary }}>{table.label ?? `Table ${table.number}`}</Text>
          <Text style={{ ...typography.caption, color: colors.text.tertiary, textTransform: 'capitalize' }}>{table.status.toLowerCase()}</Text>
          {activeOrder ? (
            <Text style={{ ...typography.caption, color: colors.brand.gold }}>${activeOrder.totalAmount.toFixed(2)}</Text>
          ) : null}
        </View>
      </SurfaceCard>
    </ScalePressable>
  );
}

export default function FloorScreen() {
  const { data: session } = useSession();
  const role = (session?.user as AppUser | undefined)?.role ?? 'employee';
  const canManageMenu = role === 'owner' || role === 'manager';

  const { data: tables, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get<RestaurantTable[]>('/api/tables'),
  });

  return (
    <ScreenScroll
      title="Floor"
      subtitle="Tables and live orders"
      testID="floor-screen"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.brand.gold} />
      }
    >
      {canManageMenu ? (
        <StaggerItem index={0}>
          <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
            <PrimaryButton
              label="Manage tables"
              icon={Grid3x3}
              onPress={() => router.push('/tables-manage' as Href)}
              testID="manage-tables-button"
            />
            <SecondaryButton
              label="Manage menu"
              icon={UtensilsCrossed}
              onPress={() => router.push('/menu-manage' as Href)}
              testID="manage-menu-button"
            />
          </View>
        </StaggerItem>
      ) : null}

      {isLoading ? (
        <View testID="floor-loading">
          <TileGridSkeleton />
        </View>
      ) : null}

      {!isLoading && (tables?.length ?? 0) === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No tables"
          description={canManageMenu ? 'Add table numbers in Manage tables.' : 'Ask a manager to add tables.'}
          color={colors.brand.primary}
        />
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {tables?.map((table, index) => (
          <StaggerItem key={table.id} index={1 + index} style={{ width: '47%' }}>
            <TableTile table={table} />
          </StaggerItem>
        ))}
      </View>
    </ScreenScroll>
  );
}
