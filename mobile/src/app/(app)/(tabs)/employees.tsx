import { ActivityIndicator, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Users } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge } from '@/components/buttons';
import { EmptyState, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { getColorForId, getInitials } from '@/lib/formatters';
import { colors, radius, spacing, typography } from '@/theme';
import type { Employee } from '@/types/app';

export default function Employees() {
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<Employee[]>('/api/employees'),
  });

  const activeCount = employees?.filter((employee) => employee.isActive).length ?? 0;

  return (
    <ScreenScroll
      title="Team"
      subtitle={`${employees?.length ?? 0} members${activeCount > 0 ? ` · ${activeCount} active` : ''}`}
      testID="employees-scroll"
    >
      <View testID="employees-screen">
        {isLoading ? <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.xxxl }} testID="employees-loading" /> : null}

        {employees?.length ? (
          <View style={{ gap: spacing.md }}>
            {employees.map((employee) => {
              const accent = getColorForId(employee.id);

              return (
                <SurfaceCard key={employee.id}>
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
                        <Text style={{ ...typography.h4, color: colors.text.primary, flex: 1 }}>
                          {employee.user?.name}
                        </Text>
                        <AccentBadge
                          label={employee.isActive ? 'active' : 'inactive'}
                          color={employee.isActive ? colors.success.base : colors.danger.base}
                          tint={employee.isActive ? colors.success.muted : colors.danger.muted}
                        />
                      </View>
                      <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>
                        {employee.user?.email}
                      </Text>
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
            })}
          </View>
        ) : !isLoading ? (
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Share your restaurant ID from settings to invite your staff."
            color={colors.brand.primary}
            testID="employees-empty"
          />
        ) : null}
      </View>
    </ScreenScroll>
  );
}
