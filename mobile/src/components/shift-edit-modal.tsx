import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Trash2, X } from 'lucide-react-native';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { api } from '@/lib/api/api';
import { showError, showSuccess } from '@/lib/toast';
import { colors, radius, spacing, typography } from '@/theme';
import type { Shift } from '@/types/app';

interface ShiftEditModalProps {
  shift: Shift | null;
  visible: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function ShiftEditModal({ shift, visible, onClose, onUpdated }: ShiftEditModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('17:00');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!shift) return;
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    setTitle(shift.title);
    setDate(start.toISOString().split('T')[0] ?? '');
    setStartHour(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
    setEndHour(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
    setNotes(shift.notes ?? '');
  }, [shift]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.put<Shift>(`/api/shifts/${shift!.id}`, {
        title,
        startTime: new Date(`${date}T${startHour}:00`).toISOString(),
        endTime: new Date(`${date}T${endHour}:00`).toISOString(),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess('Shift updated');
      onUpdated();
      onClose();
    },
    onError: (err) => showError('Update failed', err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.put<Shift>(`/api/shifts/${shift!.id}`, { status: 'CANCELLED' }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess('Shift cancelled');
      onUpdated();
      onClose();
    },
    onError: (err) => showError('Cancel failed', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/shifts/${shift!.id}`),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess('Shift deleted');
      onUpdated();
      onClose();
    },
    onError: (err) => showError('Delete failed', err.message),
  });

  if (!shift) return null;

  const fields = [
    { key: 'title', label: 'Shift title', value: title, setValue: setTitle },
    { key: 'date', label: 'Date', value: date, setValue: setDate },
    { key: 'start', label: 'Start time', value: startHour, setValue: setStartHour },
    { key: 'end', label: 'End time', value: endHour, setValue: setEndHour },
  ] as const;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View style={{ borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, backgroundColor: colors.bg.overlay, borderTopWidth: 1, borderTopColor: colors.border.default, padding: 20, paddingBottom: 40, maxHeight: '90%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
            <Text style={{ ...typography.h2, color: colors.text.primary }}>Edit shift</Text>
            <Pressable onPress={onClose} testID="shift-edit-close">
              <X color={colors.text.secondary} size={20} strokeWidth={2} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: spacing.md }}>
              {fields.map((field) => (
                <View key={field.key}>
                  <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: spacing.sm }}>{field.label}</Text>
                  <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.surface }}>
                    <TextInput value={field.value} onChangeText={field.setValue} placeholderTextColor={colors.text.disabled} style={{ minHeight: 52, paddingHorizontal: spacing.lg, color: colors.text.primary, fontSize: 16 }} testID={`shift-edit-${field.key}`} />
                  </View>
                </View>
              ))}
              <View>
                <Text style={{ ...typography.label, color: colors.text.tertiary, marginBottom: spacing.sm }}>Notes</Text>
                <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.surface }}>
                  <TextInput value={notes} onChangeText={setNotes} placeholderTextColor={colors.text.disabled} style={{ minHeight: 52, paddingHorizontal: spacing.lg, color: colors.text.primary, fontSize: 16 }} testID="shift-edit-notes" />
                </View>
              </View>
            </View>
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              <PrimaryButton label="Save changes" onPress={() => updateMutation.mutate()} loading={updateMutation.isPending} disabled={!title || !date} testID="shift-save-button" />
              {shift.status !== 'CANCELLED' ? <SecondaryButton label="Cancel shift" onPress={() => cancelMutation.mutate()} loading={cancelMutation.isPending} testID="shift-cancel-button" /> : null}
              <Pressable onPress={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md }} testID="shift-delete-button">
                <Trash2 color={colors.danger.base} size={16} strokeWidth={2} />
                <Text style={{ ...typography.body, color: colors.danger.base }}>Delete shift</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
