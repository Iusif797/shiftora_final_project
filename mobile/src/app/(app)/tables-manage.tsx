import { useState } from 'react';
import { RefreshControl, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus, Trash2, X } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { PrimaryButton } from '@/components/buttons';
import { SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { api } from '@/lib/api/api';
import { showError, showSuccess } from '@/lib/toast';
import { colors, radius, spacing, typography } from '@/theme';
import type { RestaurantTable } from '@/types/pos';

export default function TablesManageScreen() {
  const queryClient = useQueryClient();
  const [number, setNumber] = useState('');
  const [label, setLabel] = useState('');
  const [capacity, setCapacity] = useState('4');

  const { data: tables, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get<RestaurantTable[]>('/api/tables'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tables'] });
  };

  const createTable = useMutation({
    mutationFn: () =>
      api.post<RestaurantTable>('/api/tables', {
        number: Number(number),
        label: label.trim() || undefined,
        capacity: Number(capacity) || 4,
      }),
    onSuccess: () => {
      setNumber('');
      setLabel('');
      setCapacity('4');
      showSuccess('Table added');
      invalidate();
    },
    onError: (err) => showError('Failed', err.message),
  });

  const deleteTable = useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/tables/${id}`),
    onSuccess: () => {
      showSuccess('Table removed');
      invalidate();
    },
    onError: (err) => showError('Failed', err.message),
  });

  const canSubmit = Number(number) > 0;

  return (
    <ScreenScroll
      title="Tables"
      subtitle="Floor numbers and seats"
      leftSlot={<ScalePressable onPress={() => router.back()} scale={0.9} testID="tables-manage-back"><X color={colors.text.secondary} size={22} /></ScalePressable>}
      testID="tables-manage-screen"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.brand.gold} />}
    >
      <SurfaceCard>
        <Text style={{ ...typography.h4, color: colors.text.primary, marginBottom: spacing.md }}>Add table</Text>
        <TextInput value={number} onChangeText={setNumber} placeholder="Number (1, 2, 3…)" keyboardType="number-pad" placeholderTextColor={colors.text.disabled} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, paddingHorizontal: spacing.md, color: colors.text.primary, marginBottom: spacing.sm }} testID="table-number-input" />
        <TextInput value={label} onChangeText={setLabel} placeholder="Label (Terrace, Window…)" placeholderTextColor={colors.text.disabled} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, paddingHorizontal: spacing.md, color: colors.text.primary, marginBottom: spacing.sm }} testID="table-label-input" />
        <TextInput value={capacity} onChangeText={setCapacity} placeholder="Seats" keyboardType="number-pad" placeholderTextColor={colors.text.disabled} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, paddingHorizontal: spacing.md, color: colors.text.primary, marginBottom: spacing.md }} testID="table-capacity-input" />
        <PrimaryButton label="Add table" icon={Plus} onPress={() => createTable.mutate()} loading={createTable.isPending} disabled={!canSubmit} testID="add-table-button" />
      </SurfaceCard>

      {isLoading ? (
        <View style={{ marginTop: spacing.lg }}>
          <CardListSkeleton count={4} />
        </View>
      ) : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        {tables?.map((table, index) => (
          <StaggerItem key={table.id} index={index}>
            <SurfaceCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(130,102,255,0.15)' }}>
                  <Text style={{ ...typography.h3, color: colors.brand.primaryLight }}>{table.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: colors.text.primary }}>{table.label ?? `Table ${table.number}`}</Text>
                  <Text style={{ ...typography.caption, color: colors.text.tertiary }}>{table.capacity} seats · {table.status.toLowerCase()}</Text>
                </View>
                <ScalePressable onPress={() => deleteTable.mutate(table.id)} disabled={deleteTable.isPending} scale={0.9} hitSlop={12} testID={`delete-table-${table.number}`}>
                  <Trash2 color={colors.danger.base} size={20} />
                </ScalePressable>
              </View>
            </SurfaceCard>
          </StaggerItem>
        ))}
      </View>
    </ScreenScroll>
  );
}
