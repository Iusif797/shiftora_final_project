import { getActiveBcp47, translate } from '@/i18n/active';
import { peoplePalette } from '@/theme';

/**
 * Times and dates follow the active app language, not the device's — someone
 * who switched Shiftora to Czech expects 14:30, not 2:30 PM, even on an
 * en-US phone. `hour12` is therefore left to the locale rather than forced.
 */
export function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString(getActiveBcp47(), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return translate('time.today');
  }

  if (date.toDateString() === tomorrow.toDateString()) {
    return translate('time.tomorrow');
  }

  return date.toLocaleDateString(getActiveBcp47(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getColorForId(id: string): string {
  return peoplePalette[id.charCodeAt(0) % peoplePalette.length] ?? peoplePalette[0];
}

export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return translate('greeting.morning');
  }

  if (hour < 17) {
    return translate('greeting.afternoon');
  }

  return translate('greeting.evening');
}
