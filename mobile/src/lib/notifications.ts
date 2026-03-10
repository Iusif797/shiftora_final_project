import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SHIFT_REMINDER_MINS = 30;
const CHANNEL_ID = 'shift-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Shift reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function scheduleShiftReminders(
  shifts: { id: string; title: string; startTime: string }[]
): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  for (const shift of shifts) {
    const start = new Date(shift.startTime).getTime();
    const triggerAt = start - SHIFT_REMINDER_MINS * 60 * 1000;
    if (triggerAt <= now) continue;

    const trigger: Notifications.NotificationTriggerInput =
      Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerAt), channelId: CHANNEL_ID }
        : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerAt) };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Shift reminder',
        body: `Your shift "${shift.title}" starts in ${SHIFT_REMINDER_MINS} minutes`,
        data: { shiftId: shift.id },
      },
      trigger,
    });
  }
}
