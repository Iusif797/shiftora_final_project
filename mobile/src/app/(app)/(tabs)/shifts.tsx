import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { Calendar, Clock3, Pencil, Plus, QrCode, Sparkles, X } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { ShiftEditModal } from '@/components/shift-edit-modal';
import { AccentBadge, PrimaryButton } from '@/components/buttons';
import { EmptyState, SurfaceCard } from '@/components/cards';
import { StaggerItem, enterZoom } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { api } from '@/lib/api/api';
import { showError, showSuccess } from '@/lib/toast';
import { useSession } from '@/lib/auth/use-session';
import { formatDate, formatTime } from '@/lib/formatters';
import { colors, radius, spacing, statusAppearance, typography } from '@/theme';
import type { AppUser, Shift, ShiftAssignment, Employee } from '@/types/app';

function ShiftCard({ shift, onShowQR, onEdit }: { shift: Shift; onShowQR?: (s: Shift) => void; onEdit?: (s: Shift) => void }) {
  const appearance = statusAppearance[shift.status] ?? statusAppearance.SCHEDULED;
  const hasAssignments = (shift.assignments?.length ?? 0) > 0;

  return (
    <SurfaceCard>
      <Pressable onPress={() => hasAssignments && onShowQR?.(shift)}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.h3, color: colors.text.primary }}>{shift.title}</Text>
            <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: spacing.xs }}>
              {formatDate(shift.startTime)} · {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {onEdit ? (
              <ScalePressable
                onPress={() => onEdit(shift)}
                scale={0.9}
                hitSlop={8}
                style={{ padding: spacing.xs }}
                accessibilityLabel="Edit shift"
                testID={`edit-shift-${shift.id}`}
              >
                <Pencil color={colors.text.secondary} size={16} strokeWidth={2} />
              </ScalePressable>
            ) : null}
            <AccentBadge label={shift.status.toLowerCase()} color={appearance.color} tint={appearance.tint} />
          </View>
        </View>
        {shift.notes ? (
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: spacing.md }}>
            {shift.notes}
          </Text>
        ) : null}
        {hasAssignments ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
            <Text style={{ ...typography.caption, color: colors.text.tertiary }}>{shift.assignments!.length} assigned</Text>
            <QrCode color={colors.brand.gold} size={14} strokeWidth={2} />
          </View>
        ) : null}
      </Pressable>
    </SurfaceCard>
  );
}

function QRModal({ shift, visible, onClose }: { shift: Shift | null; visible: boolean; onClose: () => void }) {
  const { data: tokens, isLoading, isError, refetch } = useQuery({
    queryKey: ['checkin-tokens', shift?.id],
    queryFn: () =>
      api.get<{ assignmentId: string; employeeName: string; token: string; expiresAt: string }[]>(
        `/api/shifts/${shift!.id}/checkin-tokens`
      ),
    enabled: visible && Boolean(shift?.id),
    staleTime: 8 * 60 * 1000,
    refetchInterval: visible ? 8 * 60 * 1000 : false,
  });

  if (!shift?.assignments?.length) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl }} onPress={onClose}>
        <Pressable style={{ backgroundColor: colors.bg.card, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border.default }} onPress={(e) => e.stopPropagation()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <Text style={{ ...typography.h3, color: colors.text.primary }}>Check-in QR</Text>
            <Pressable onPress={onClose} style={{ padding: spacing.sm }}>
              <X color={colors.text.secondary} size={20} strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginBottom: spacing.lg }}>{shift.title}</Text>
          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: spacing.xl }}>
              {isLoading ? <ActivityIndicator color={colors.brand.primary} /> : null}
              {isError ? (
                <View style={{ alignItems: 'center', gap: spacing.md }}>
                  <Text style={{ ...typography.bodySmall, color: colors.danger.base }}>Could not load secure QR codes.</Text>
                  <PrimaryButton label="Try again" onPress={() => refetch()} />
                </View>
              ) : null}
              {tokens?.map((item) => (
                <View key={item.assignmentId} style={{ alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
                  <Text style={{ ...typography.body, color: colors.text.primary, marginBottom: spacing.sm }}>{item.employeeName}</Text>
                  <View style={{ padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: radius.lg }}>
                    <QRCode value={item.token} size={180} backgroundColor="#FFFFFF" color="#000000" />
                  </View>
                  <Text style={{ ...typography.caption, color: colors.text.tertiary, marginTop: spacing.sm }}>Refreshes every 8 minutes</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CreateShiftModal({
  visible,
  onClose,
  onCreated,
  employees,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  employees: Employee[];
}) {
  const today = new Date().toISOString().split('T')[0] ?? '';
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(today);
  const [startHour, setStartHour] = useState<string>('09:00');
  const [endHour, setEndHour] = useState<string>('17:00');
  const [notes, setNotes] = useState<string>('');
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      const shiftRes = await api.post<Shift>('/api/shifts', {
        title,
        startTime: new Date(`${date}T${startHour}:00`).toISOString(),
        endTime: new Date(`${date}T${endHour}:00`).toISOString(),
        notes: notes || undefined,
      });

      if (assignedEmployeeIds.length > 0) {
        for (const empId of assignedEmployeeIds) {
          await api.post(`/api/shifts/${shiftRes.id}/assign`, { employeeId: empId });
        }
      }
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle('');
      setDate(today);
      setStartHour('09:00');
      setEndHour('17:00');
      setNotes('');
      setAssignedEmployeeIds([]);
      onCreated();
      onClose();
    },
  });

  const fields = [
    { key: 'title', label: 'Shift title', value: title, setValue: setTitle, placeholder: 'Dinner service' },
    { key: 'date', label: 'Date', value: date, setValue: setDate, placeholder: today },
    { key: 'start', label: 'Start time', value: startHour, setValue: setStartHour, placeholder: '09:00' },
    { key: 'end', label: 'End time', value: endHour, setValue: setEndHour, placeholder: '17:00' },
  ] as const;

  const toggleEmployee = (id: string) => {
    setAssignedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View
          style={{
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            backgroundColor: colors.bg.overlay,
            borderTopWidth: 1,
            borderTopColor: colors.border.default,
            padding: 20,
            paddingBottom: 40,
            maxHeight: '90%',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
            <Text style={{ ...typography.h2, color: colors.text.primary }}>Create shift</Text>
            <Pressable
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.lg,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.bg.surface,
                borderWidth: 1,
                borderColor: colors.border.default,
              }}
            >
              <X color={colors.text.secondary} size={18} strokeWidth={2.2} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: spacing.md }}>
              {fields.map((field) => (
                <View key={field.key}>
                  <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: spacing.sm }}>{field.label}</Text>
                  <View
                    style={{
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: colors.border.default,
                      backgroundColor: colors.bg.surface,
                    }}
                  >
                    <TextInput
                      value={field.value}
                      onChangeText={field.setValue}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.text.disabled}
                      autoCapitalize={field.key === 'title' ? 'words' : 'none'}
                      style={{ minHeight: 52, paddingHorizontal: spacing.lg, color: colors.text.primary, fontSize: 16 }}
                      testID={`shift-input-${field.key}`}
                    />
                  </View>
                </View>
              ))}

              <View>
                <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: spacing.sm }}>Notes</Text>
                <View
                  style={{
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.border.default,
                    backgroundColor: colors.bg.surface,
                  }}
                >
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Optional notes"
                    placeholderTextColor={colors.text.disabled}
                    style={{ minHeight: 52, paddingHorizontal: spacing.lg, color: colors.text.primary, fontSize: 16 }}
                    testID="shift-input-notes"
                  />
                </View>
              </View>

              {employees.length > 0 && (
                <View style={{ marginTop: spacing.sm }}>
                  <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: spacing.sm }}>Assign employees</Text>
                  <View style={{ gap: spacing.sm }}>
                    {employees.map((emp) => {
                      const isSelected = assignedEmployeeIds.includes(emp.id);
                      return (
                        <ScalePressable
                          key={emp.id}
                          onPress={() => toggleEmployee(emp.id)}
                          scale={0.98}
                          testID={`assign-employee-${emp.id}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: spacing.md,
                            borderRadius: radius.lg,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.brand.primaryLight : colors.border.default,
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : colors.bg.surface,
                          }}
                        >
                          <Text style={{ ...typography.body, color: isSelected ? colors.text.primary : colors.text.secondary }}>
                            {emp.user.name}
                          </Text>
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: radius.full,
                              borderWidth: 2,
                              borderColor: isSelected ? colors.brand.primaryLight : colors.border.default,
                              backgroundColor: isSelected ? colors.brand.primaryLight : 'transparent',
                            }}
                          />
                        </ScalePressable>
                      );
                    })}
                  </View>
                </View>
              )}

            </View>
            <View style={{ marginTop: spacing.xl }}>
              <PrimaryButton
                label="Create shift"
                onPress={() => mutation.mutate()}
                loading={mutation.isPending}
                icon={Plus}
                disabled={!title || !date}
                testID="create-shift-button"
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function Shifts() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const handledCreateParam = useRef<string | undefined>(undefined);
  const { data: session } = useSession();
  const role = (session?.user as AppUser | undefined)?.role ?? 'employee';
  const isManager = role === 'manager' || role === 'owner';
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [qrShift, setQrShift] = useState<Shift | null>(null);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isManager && create && handledCreateParam.current !== create) {
      handledCreateParam.current = create;
      setShowCreate(true);
    }
  }, [create, isManager]);

  const { data: shifts, isLoading, isRefetching: refreshingShifts, refetch: refetchShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => api.get<Shift[]>('/api/shifts'),
    enabled: isManager,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<{ items: Employee[] }>('/api/employees?limit=100'),
    enabled: isManager,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post<{ created: number; shifts: unknown[] }>('/api/shifts/generate', {}),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      const count = data?.created ?? 0;
      showSuccess(count > 0 ? `${count} shifts created` : 'Schedule up to date', count > 0 ? 'Auto-generated for next week.' : 'No new slots needed.');
    },
    onError: (err) => showError('Generation failed', err.message),
  });

  const { data: myShifts, isLoading: loadingMy, isRefetching: refreshingMy, refetch: refetchMy } = useQuery({
    queryKey: ['my-shifts'],
    queryFn: () => api.get<ShiftAssignment[]>('/api/shifts/my'),
    enabled: !isManager,
  });

  const loading = isManager ? isLoading : loadingMy;

  return (
    <>
      <ScreenScroll
        title="Schedule"
        subtitle={isManager ? `${shifts?.length ?? 0} scheduled` : `${myShifts?.length ?? 0} assigned`}
        testID="shifts-scroll"
        refreshControl={
          <RefreshControl
            refreshing={isManager ? refreshingShifts : refreshingMy}
            onRefresh={() => (isManager ? refetchShifts() : refetchMy())}
            tintColor={colors.brand.gold}
          />
        }
      >
        <View testID="shifts-screen">
          {loading ? (
            <View testID="shifts-loading">
              <CardListSkeleton count={4} />
            </View>
          ) : null}

          {isManager ? (
            shifts?.length ? (
              <View style={{ gap: spacing.md, paddingBottom: 0 }}>
                {shifts.map((shift, index) => (
                  <StaggerItem key={shift.id} index={index}>
                    <ShiftCard shift={shift} onShowQR={setQrShift} onEdit={setEditShift} />
                  </StaggerItem>
                ))}
              </View>
            ) : !loading ? (
              <EmptyState
                icon={Calendar}
                title="No shifts yet"
                description="Create your first shift to start planning the week."
                color={colors.brand.primary}
                action={{ label: 'Create shift', onPress: () => setShowCreate(true), testID: 'shifts-empty-create' }}
                testID="shifts-empty"
              />
            ) : null
          ) : myShifts?.length ? (
            <View style={{ gap: spacing.md }}>
              {myShifts.map((assignment, index) =>
                assignment.shift ? (
                  <StaggerItem key={assignment.id} index={index}>
                    <ShiftCard shift={assignment.shift} />
                  </StaggerItem>
                ) : null,
              )}
            </View>
          ) : !loading ? (
            <EmptyState
              icon={Clock3}
              title="No shifts assigned"
              description="Your manager will assign shifts here when the schedule is ready."
              color={colors.brand.gold}
              testID="my-shifts-empty"
            />
          ) : null}
        </View>
      </ScreenScroll>

      {isManager ? (
        <Animated.View
          entering={enterZoom(2)}
          style={{ position: 'absolute', bottom: 130, right: 20, flexDirection: 'row', gap: 12 }}
        >
          <ScalePressable
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            scale={0.9}
            haptic="medium"
            accessibilityLabel="Auto-generate schedule"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.brand.gold,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            testID="generate-schedule-button"
          >
            {generateMutation.isPending ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Sparkles color="#000000" size={24} strokeWidth={2} />
            )}
          </ScalePressable>
          <ScalePressable
            onPress={() => setShowCreate(true)}
            scale={0.9}
            haptic="medium"
            accessibilityLabel="Create shift"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.brand.primary,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            testID="new-shift-button"
          >
            <Plus color="#000000" size={24} strokeWidth={2.5} />
          </ScalePressable>
        </Animated.View>
      ) : null}

      <CreateShiftModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['shifts'] })}
        employees={employees?.items ?? []}
      />
      <QRModal shift={qrShift} visible={!!qrShift} onClose={() => setQrShift(null)} />
      <ShiftEditModal
        shift={editShift}
        visible={!!editShift}
        onClose={() => setEditShift(null)}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ['shifts'] })}
      />
    </>
  );
}
