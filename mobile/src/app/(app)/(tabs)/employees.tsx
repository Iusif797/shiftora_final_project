import { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Users } from 'lucide-react-native';
import { AppBackground, ScreenHeader } from '@/components/app-shell';
import { AccentBadge } from '@/components/buttons';
import { EmptyState, ErrorState, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { getColorForId, getInitials } from '@/lib/formatters';
import { colors, radius, spacing, typography } from '@/theme';
import type { Employee, PaginatedResponse } from '@/types/app';

const PAGE_SIZE = 100;

const EmployeeCard = memo(function EmployeeCard({ employee }: { employee: Employee }) {
  const accent = getColorForId(employee.id);
  return (
    <SurfaceCard>
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
    </SurfaceCard>
  );
});

function EmployeesScreen() {
  const { data, isLoading, isError, error, refetch } = useQuery({
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
    ({ item }: { item: Employee }) => <EmployeeCard employee={item} />,
    []
  );
  const keyExtractor = useCallback((item: Employee) => item.id, []);

  const listHeader = (
    <View style={{ marginBottom: spacing.md }}>
      {isLoading ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.xxxl }} testID="employees-loading" />
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
            message={error instanceof Error ? error.message : 'Не удалось загрузить список сотрудников'}
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
        <View style={{ paddingHorizontal: 20, paddingTop: spacing.xl }}>
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Share your restaurant ID from settings to invite your staff."
            color={colors.brand.primary}
            testID="employees-empty"
          />
        </View>
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
        testID="employees-list"
      />
    </AppBackground>
  );
}

export default memo(EmployeesScreen);
