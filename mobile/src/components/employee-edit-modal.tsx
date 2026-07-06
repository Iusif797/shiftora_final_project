import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { PrimaryButton } from '@/components/buttons';
import { api } from '@/lib/api/api';
import { showError, showSuccess } from '@/lib/toast';
import { colors, radius, spacing, typography } from '@/theme';
import type { Employee } from '@/types/app';

interface EmployeeEditModalProps {
  employee: Employee | null;
  visible: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function EmployeeEditModal({ employee, visible, onClose, onUpdated }: EmployeeEditModalProps) {
  const [position, setPosition] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!employee) return;
    setPosition(employee.position ?? '');
    setHourlyRate(employee.hourlyRate != null ? String(employee.hourlyRate) : '');
    setIsActive(employee.isActive);
  }, [employee]);

  const mutation = useMutation({
    mutationFn: () =>
      api.put<Employee>(`/api/employees/${employee!.id}`, {
        position: position.trim() || null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        isActive,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess('Employee updated');
      onUpdated();
      onClose();
    },
    onError: (err) => showError('Update failed', err.message),
  });

  if (!employee) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View style={{ borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, backgroundColor: colors.bg.overlay, borderTopWidth: 1, borderTopColor: colors.border.default, padding: 20, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
            <Text style={{ ...typography.h2, color: colors.text.primary }}>{employee.user.name}</Text>
            <Pressable onPress={onClose} testID="employee-edit-close">
              <X color={colors.text.secondary} size={20} strokeWidth={2} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: spacing.md }}>
              <View>
                <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: spacing.sm }}>Position</Text>
                <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.surface }}>
                  <TextInput value={position} onChangeText={setPosition} placeholder="Server, bartender..." placeholderTextColor={colors.text.disabled} style={{ minHeight: 52, paddingHorizontal: spacing.lg, color: colors.text.primary, fontSize: 16 }} testID="employee-edit-position" />
                </View>
              </View>
              <View>
                <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: spacing.sm }}>Hourly rate</Text>
                <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.surface }}>
                  <TextInput value={hourlyRate} onChangeText={setHourlyRate} placeholder="15.00" keyboardType="decimal-pad" placeholderTextColor={colors.text.disabled} style={{ minHeight: 52, paddingHorizontal: spacing.lg, color: colors.text.primary, fontSize: 16 }} testID="employee-edit-rate" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }}>
                <Text style={{ ...typography.body, color: colors.text.primary }}>Active employee</Text>
                <Switch value={isActive} onValueChange={setIsActive} testID="employee-edit-active" />
              </View>
            </View>
            <View style={{ marginTop: spacing.xl }}>
              <PrimaryButton label="Save" onPress={() => mutation.mutate()} loading={mutation.isPending} testID="employee-save-button" />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
