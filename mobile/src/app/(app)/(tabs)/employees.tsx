import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, UserPlus, Users } from 'lucide-react-native';
import { router, type Href } from 'expo-router';
import { AppBackground, ScreenHeader } from '@/components/app-shell';
import { EmployeeEditModal } from '@/components/employee-edit-modal';
import { PrimaryButton, AccentBadge } from '@/components/buttons';
import { EmptyState, ErrorState, SurfaceCard } from '@/components/cards';
import { StaggerItem } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import { getColorForId, getInitials } from '@/lib/formatters';
import { colors, radius, spacing, typography } from '@/theme';
import type { AppUser, Employee, PaginatedResponse } from '@/types/app';

const PAGE_SIZE = 100;

const EmployeeCard = memo(function EmployeeCard({ employee, onPress }: { employee: Employee; onPress?: () => void }) {
  const accent = getColorForId(employee.id);
  return (
    <SurfaceCard>
      <ScalePressable onPress={onPress} disabled={!onPress} scale={0.98}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }} testID={`employee-card-${employee.id}`}>
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${accent}18`,
            borderWidth: 1,
            borderColor: `${accent}38`,
          }}
        >
          <Text style={{ ...typography.h4, color: accent }}>{getInitials(employee.user?.name ?? '?')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <Text style={{ ...typography.h4, color: colors.text.primary, flex: 1 }}>{employee.user?.name}</Text>
            <AccentBadge
              label={employee.isActive ? 'active' : 'inactive'}
              color={employee.isActive ? colors.success.base : colors.danger.base}
              tint={employee.isActive ? colors.success.muted : colors.danger.muted}
            />
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>{employee.user?.email}</Text>
          {employee.position ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
              <Briefcase color={accent} size={12} strokeWidth={1.8} />
              <Text style={{ ...typography.caption, color: accent }}>{employee.position}</Text>
            </View>
          ) : null}
        </View>
      </View>
      </ScalePressable>
    </SurfaceCard>
  );
});

function EmployeesScreen() {
  const { data: session } = useSession();
  const role = (session?.user as AppUser | undefined)?.role ?? 'employee';
  const canManage = role === 'manager' || role === 'owner';
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: () =>
      api.get<PaginatedResponse<Employee>>(`/api/employees?page=1&limit=${PAGE_SIZE}`),
  });

  const employees = useMemo(
    () => (data?.items ?? []) as Employee[],
    [data?.items]
  );
  const activeCount = useMemo(
    () => employees.filter((employee) => employee.isActive).length,
    [employees]
  );
  const handleRetry = useCallback(() => refetch(), [refetch]);

  const renderItem = useCallback(
    ({ item, index }: { item: Employee; index: number }) => (
      <StaggerItem index={index} style={index > 0 ? { marginTop: spacing.md } : undefined}>
        <EmployeeCard employee={item} onPress={canManage ? () => setEditEmployee(item) : undefined} />
      </StaggerItem>
    ),
    [canManage]
  );
  const keyExtractor = useCallback((item: Employee) => item.id, []);

  const listHeader = (
    <View style={{ marginBottom: spacing.md, gap: spacing.md }}>
      {canManage ? (
        <>
          <PrimaryButton label="Invite team" icon={UserPlus} onPress={() => router.push('/invitations' as Href)} testID="employees-invite-button" />
        </>
      ) : null}
      {isLoading ? (
        <View testID="employees-loading">
          <CardListSkeleton count={4} />
        </View>
      ) : null}
    </View>
  );
  const listFooter = null;

  if (isError) {
    return (
      <AppBackground>
        <ScreenHeader title="Team" subtitle="0 members" />
        <View style={{ paddingHorizontal: 20, paddingTop: spacing.xl }}>
          <ErrorState
            message={error instanceof Error ? error.message : 'Could not load the team'}
            onRetry={handleRetry}
            testID="employees-error"
          />
        </View>
      </AppBackground>
    );
  }

  if (!isLoading && employees.length === 0) {
    return (
      <AppBackground>
        <ScreenHeader title="Team" subtitle="0 members" />
        <View style={{ paddingHorizontal: 20, paddingTop: spacing.xl, gap: spacing.md }}>
          {canManage ? <PrimaryButton label="Invite team" icon={UserPlus} onPress={() => router.push('/invitations' as Href)} testID="employees-invite-button" /> : null}
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Generate an invite code and share it with staff during onboarding."
            color={colors.brand.primary}
            testID="employees-empty"
          />
        </View>
        <EmployeeEditModal employee={editEmployee} visible={!!editEmployee} onClose={() => setEditEmployee(null)} onUpdated={() => refetch()} />
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScreenHeader
        title="Team"
        subtitle={`${employees.length} members${activeCount > 0 ? ` · ${activeCount} active` : ''}`}
      />
      <FlatList
        data={employees}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.brand.gold} />
        }
        testID="employees-list"
      />
      <EmployeeEditModal
        employee={editEmployee}
        visible={!!editEmployee}
        onClose={() => setEditEmployee(null)}
        onUpdated={() => refetch()}
      />
    </AppBackground>
  );
}

export default memo(EmployeesScreen);
