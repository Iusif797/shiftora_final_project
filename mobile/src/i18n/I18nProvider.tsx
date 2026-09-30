/**
 * Locale state for the whole app: what language is active, how it is
 * persisted, and what happens to layout direction when it changes.
 *
 * Deliberately hand-rolled — no i18n dependency. The resolution logic lives in
 * `resolver.ts` and the direction decision in `direction.ts`, both pure and
 * unit-tested; this file is only the React wiring and the side effects.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { I18nManager, Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setActiveLocale } from './active';
import { readDeviceLocales } from './device-locale';
import { planDirectionChange, type Runtime } from './direction';
import { reloadApp } from './reload';
import { dirProp } from './rtl-styles';
import {
  DEFAULT_LOCALE,
  LOCALE_NATIVE_NAMES,
  SUPPORTED_LOCALES,
  asSupportedLocale,
  directionForLocale,
  isRtlLocale,
  resolveInitialLocale,
  resolveTranslation,
  type Direction,
  type InterpolationParams,
  type SupportedLocale,
  type TranslationKey,
} from './resolver';

export const LOCALE_STORAGE_KEY = 'shiftora.i18n.locale';

export interface LocaleOption {
  code: SupportedLocale;
  nativeName: string;
  direction: Direction;
}

export interface I18nContextValue {
  locale: SupportedLocale;
  locales: readonly LocaleOption[];
  t: (key: TranslationKey, params?: InterpolationParams) => string;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  direction: Direction;
  isRTL: boolean;
  /** Native only: the flag is stored but the running layout has not flipped. */
  restartRequired: boolean;
  /** Returns false when we cannot relaunch ourselves — tell the person to do it. */
  applyRestart: () => Promise<boolean>;
  /** False until the persisted locale has been read back. */
  ready: boolean;
}

const LOCALE_OPTIONS: readonly LocaleOption[] = SUPPORTED_LOCALES.map((code) => ({
  code,
  nativeName: LOCALE_NATIVE_NAMES[code],
  direction: directionForLocale(code),
}));

const runtime: Runtime = Platform.OS === 'web' ? 'web' : 'native';

function applyWebDirection(direction: Direction, locale: SupportedLocale): void {
  if (Platform.OS !== 'web') return;
  const doc = (globalThis as { document?: { documentElement?: { dir: string; lang: string } } })
    .document;
  if (!doc?.documentElement) return;
  doc.documentElement.dir = direction;
  doc.documentElement.lang = locale;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() =>
    resolveInitialLocale(readDeviceLocales()),
  );
  const [ready, setReady] = useState(false);
  const [restartRequired, setRestartRequired] = useState(false);

  const direction = directionForLocale(locale);

  // Keep the non-React readers (formatters, toasts) in step, synchronously,
  // so a render never sees a stale locale.
  setActiveLocale(locale);

  // Read the stored choice once. A stored value always wins over the device
  // language — it is an explicit decision by the person using the app.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        const parsed = asSupportedLocale(stored);
        if (parsed) setLocaleState(parsed);
      })
      .catch(() => {
        // unreadable storage — the device language stands
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Carry out the direction plan whenever the locale changes — including the
  // first run, so a device that is already Hebrew starts out mirrored.
  useEffect(() => {
    const plan = planDirectionChange(direction, runtime, I18nManager.isRTL);

    if (plan.webDir) {
      applyWebDirection(plan.webDir, locale);
    }

    if (plan.forceNativeRTL !== null) {
      try {
        I18nManager.allowRTL(plan.forceNativeRTL);
        I18nManager.forceRTL(plan.forceNativeRTL);
      } catch {
        // some native hosts reject the call; the restart notice still applies
      }
    }

    setRestartRequired(plan.restartRequired);
  }, [direction, locale]);

  const setLocale = useCallback(async (next: SupportedLocale) => {
    setLocaleState(next);
    try {
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // the choice still applies for this session
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: InterpolationParams) =>
      resolveTranslation(locale, key, params),
    [locale],
  );

  const applyRestart = useCallback(() => reloadApp(), []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      locales: LOCALE_OPTIONS,
      t,
      setLocale,
      direction,
      isRTL: isRtlLocale(locale),
      restartRequired,
      applyRestart,
      ready,
    }),
    [locale, t, setLocale, direction, restartRequired, applyRestart, ready],
  );

  return (
    <I18nContext.Provider value={value}>
      <View style={{ flex: 1 }} {...dirProp(direction)}>
        {children}
      </View>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
}

/** Shorthand for the common case: `const t = useT()`. */
export function useT(): I18nContextValue['t'] {
  return useI18n().t;
}

export { DEFAULT_LOCALE };
export type { SupportedLocale, TranslationKey, Direction };
