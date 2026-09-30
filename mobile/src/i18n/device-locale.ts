/**
 * Reading the device language WITHOUT `expo-localization` (not a dependency of
 * this app, and adding one for a single string is not worth the install).
 *
 * `Intl.DateTimeFormat().resolvedOptions().locale` is the portable answer:
 * Hermes on react-native 0.86 ships with full ICU, so it resolves to a real
 * BCP-47 tag. The try/catch is not decoration — a Hermes build compiled
 * without ICU throws here, and the app must still start.
 *
 * No react-native import, so this is directly unit-testable.
 */

interface NavigatorLike {
  languages?: readonly string[];
  language?: string;
}

export interface DeviceLocaleSources {
  /** Injectable for tests; defaults to the ambient `Intl`. */
  intl?: typeof Intl | undefined;
  /** Injectable for tests; defaults to the ambient `navigator` if present. */
  navigator?: NavigatorLike | undefined;
}

export function readDeviceLocales(sources: DeviceLocaleSources = {}): string[] {
  const intl = 'intl' in sources ? sources.intl : globalThis.Intl;
  const nav =
    'navigator' in sources
      ? sources.navigator
      : (globalThis as { navigator?: NavigatorLike }).navigator;

  const found: string[] = [];

  try {
    const resolved = intl?.DateTimeFormat().resolvedOptions().locale;
    if (resolved) found.push(resolved);
  } catch {
    // no ICU data in this build — fall through
  }

  try {
    if (nav?.languages?.length) found.push(...nav.languages);
    else if (nav?.language) found.push(nav.language);
  } catch {
    // not a browser
  }

  return found;
}
