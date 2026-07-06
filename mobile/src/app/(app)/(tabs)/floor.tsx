import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { LayoutGrid, UtensilsCrossed } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { PrimaryButton } from '@/components/buttons';
import { EmptyState, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import { colors, radius, spacing, typography } from '@/theme';
import type { AppUser } from '@/types/app';
import type { RestaurantTable } from '@/types/pos';

const tableColors = {
  FREE: colors.success.base,
  OCCUPIED: colors.danger.base,
  RESERVED: colors.warning.base,
} as const;

function TableTile({ table }: { table: RestaurantTable }) {
  const activeOrder = table.orders?.[0];
  const tone = tableColors[table.status] ?? colors.text.tertiary;

  return (
    <Pressable
      onPress={() => router.push(`/order/${table.id}` as Href)}
      style={{ width: '47%' }}
      testID={`table-tile-${table.number}`}
    >
      <SurfaceCard>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${tone}20`,
              borderWidth: 1,
              borderColor: `${tone}40`,
            }}
          >
            <Text style={{ ...typography.h2, color: tone }}>{table.number}</Text>
          </View>
          <Text style={{ ...typography.body, color: colors.text.primary }}>{table.label ?? `Table ${table.number}`}</Text>
          <Text style={{ ...typography.caption, color: colors.text.tertiary, textTransform: 'capitalize' }}>{table.status.toLowerCase()}</Text>
          {activeOrder ? (
            <Text style={{ ...typography.caption, color: colors.brand.gold }}>${activeOrder.totalAmount.toFixed(2)}</Text>
          ) : null}
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

export default function FloorScreen() {
  const { data: session } = useSession();
  const role = (session?.user as AppUser | undefined)?.role ?? 'employee';
  const canManageMenu = role === 'owner' || role === 'manager';

  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get<RestaurantTable[]>('/api/tables'),
  });

  return (
    <ScreenScroll title="Floor" subtitle="Tables and live orders" testID="floor-screen">
      {canManageMenu ? (
        <View style={{ marginBottom: spacing.lg }}>
          <PrimaryButton
            label="Manage menu"
            icon={UtensilsCrossed}
            onPress={() => router.push('/menu-manage' as Href)}
            testID="manage-menu-button"
          />
        </View>
      ) : null}

      {isLoading ? <ActivityIndicator color={colors.brand.primary} testID="floor-loading" /> : null}

      {!isLoading && (tables?.length ?? 0) === 0 ? (
        <EmptyState icon={LayoutGrid} title="No tables" description="Tables will appear when configured by a manager." color={colors.brand.primary} />
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {tables?.map((table) => <TableTile key={table.id} table={table} />)}
      </View>
    </ScreenScroll>
  );
}
