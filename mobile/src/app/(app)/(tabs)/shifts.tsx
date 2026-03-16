import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Calendar, Clock3, Plus, QrCode, Sparkles, X } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { AccentBadge, PrimaryButton } from '@/components/buttons';
import { EmptyState, SurfaceCard } from '@/components/cards';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import { formatDate, formatTime } from '@/lib/formatters';
import { colors, radius, spacing, statusAppearance, typography } from '@/theme';
import type { AppUser, Shift, ShiftAssignment, Employee } from '@/types/app';

function ShiftCard({ shift, onShowQR }: { shift: Shift; onShowQR?: (s: Shift) => void }) {
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
          <AccentBadge label={shift.status.toLowerCase()} color={appearance.color} tint={appearance.tint} />
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
  if (!shift?.assignments?.length) return null;
  const baseUrl = 'https://api.qrserver.com/v1/create-qr-code';
  const encode = (s: string) => encodeURIComponent(s);

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
              {shift.assignments!.map((a) => {
                const assignment = a as { id: string; employee?: { user?: { name?: string } } };
                const payload = `shiftora:checkin:${assignment.id}`;
                const qrUrl = `${baseUrl}/?size=180x180&data=${encode(payload)}`;
                return (
                  <View key={assignment.id} style={{ alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
                    <Text style={{ ...typography.body, color: colors.text.primary, marginBottom: spacing.sm }}>{assignment.employee?.user?.name ?? 'Employee'}</Text>
                    <Image source={{ uri: qrUrl }} style={{ width: 180, height: 180 }} contentFit="contain" />
                  </View>
                );
              })}
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
                        <Pressable
                          key={emp.id}
                          onPress={() => toggleEmployee(emp.id)}
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
                        </Pressable>
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
  const { data: session } = useSession();
  const role = (session?.user as AppUser | undefined)?.role ?? 'employee';
  const isManager = role === 'manager' || role === 'owner';
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [qrShift, setQrShift] = useState<Shift | null>(null);
  const queryClient = useQueryClient();

  const { data: shifts, isLoading } = useQuery({
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
    },
  });

  const { data: myShifts, isLoading: loadingMy } = useQuery({
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
      >
        <View testID="shifts-screen">
          {loading ? <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.xxxl }} testID="shifts-loading" /> : null}

          {isManager ? (
            shifts?.length ? (
              <View style={{ gap: spacing.md, paddingBottom: 0 }}>
                {shifts.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} onShowQR={setQrShift} />
                ))}
              </View>
            ) : !loading ? (
              <EmptyState
                icon={Calendar}
                title="No shifts yet"
                description="Create your first shift to start planning the week."
                color={colors.brand.primary}
                testID="shifts-empty"
              />
            ) : null
          ) : myShifts?.length ? (
            <View style={{ gap: spacing.md }}>
              {myShifts.map((assignment) => (assignment.shift ? <ShiftCard key={assignment.id} shift={assignment.shift} /> : null))}
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
        <View style={{ position: 'absolute', bottom: 100, right: 20, flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !employees?.items?.length}
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
          </Pressable>
          <Pressable
            onPress={() => setShowCreate(true)}
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
          </Pressable>
        </View>
      ) : null}

      <CreateShiftModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['shifts'] })}
        employees={employees?.items ?? []}
      />
      <QRModal shift={qrShift} visible={!!qrShift} onClose={() => setQrShift(null)} />
    </>
  );
}
