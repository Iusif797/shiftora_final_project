/**
 * Restarting the app after an RTL flip.
 *
 * Shiftora does not depend on `expo-updates`, so `Updates.reloadAsync()` is not
 * available. `DevSettings.reload()` works in development builds; in a release
 * build there is no supported way to relaunch ourselves, so we return false and
 * the caller asks the person to close and reopen the app.
 */
import { DevSettings, Platform } from 'react-native';

export async function reloadApp(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // A web reload re-reads document.dir, which is already set by then.
    const w = globalThis as { location?: { reload?: () => void } };
    if (typeof w.location?.reload === 'function') {
      w.location.reload();
      return true;
    }
    return false;
  }

  try {
    if (typeof DevSettings?.reload === 'function') {
      DevSettings.reload();
      return true;
    }
  } catch {
    // fall through to the manual-restart message
  }
  return false;
}
