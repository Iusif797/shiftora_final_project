/**
 * Pure translation resolution. No react-native, no react, no I/O — so it can
 * be unit-tested directly with `bun test` and reused from any runtime.
 */
import { en, type Catalog, type TranslationKey } from './locales/en';
import { cs } from './locales/cs';
import { sk } from './locales/sk';
import { pl } from './locales/pl';
import { ru } from './locales/ru';
import { uk } from './locales/uk';
import { he } from './locales/he';

export const SUPPORTED_LOCALES = ['cs', 'sk', 'pl', 'ru', 'uk', 'en', 'he'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Locales written right-to-left. Kept as data so adding ar/fa is one edit. */
export const RTL_LOCALES: readonly SupportedLocale[] = ['he'];

export const CATALOGS: Record<SupportedLocale, Catalog> = { cs, sk, pl, ru, uk, en, he };

/** Endonyms — a language is always offered in its own writing. */
export const LOCALE_NATIVE_NAMES: Record<SupportedLocale, string> = {
  cs: 'Čeština',
  sk: 'Slovenčina',
  pl: 'Polski',
  ru: 'Русский',
  uk: 'Українська',
  en: 'English',
  he: 'עברית',
};

/** BCP-47 tags for Intl (`toLocaleDateString`, `toLocaleTimeString`, …). */
export const LOCALE_BCP47: Record<SupportedLocale, string> = {
  cs: 'cs-CZ',
  sk: 'sk-SK',
  pl: 'pl-PL',
  ru: 'ru-RU',
  uk: 'uk-UA',
  en: 'en-US',
  he: 'he-IL',
};

export type Direction = 'ltr' | 'rtl';

export function isRtlLocale(locale: string): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

export function directionForLocale(locale: string): Direction {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

/**
 * Narrows an arbitrary value to a locale we ship.
 * Accepts BCP-47 tags ("he-IL", "cs_CZ", "en-GB") by taking the primary
 * subtag, so device and stored values both go through one door.
 */
export function asSupportedLocale(value: unknown): SupportedLocale | null {
  if (typeof value !== 'string') return null;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  if (!primary) return null;
  // Legacy/alternate ISO codes that still reach us from some platforms.
  const aliases: Record<string, SupportedLocale> = { iw: 'he', ua: 'uk', cz: 'cs' };
  const normalized = aliases[primary] ?? primary;
  return (SUPPORTED_LOCALES as readonly string[]).includes(normalized)
    ? (normalized as SupportedLocale)
    : null;
}

export type InterpolationParams = Record<string, string | number>;

/** Replaces `{param}` placeholders. Unknown placeholders are left untouched. */
export function interpolate(template: string, params?: InterpolationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * locale catalog → English catalog → the raw key.
 * Falling back to the key (rather than an empty string) makes a missing
 * translation visible in the UI instead of silently blank.
 */
export function resolveTranslation(
  locale: string,
  key: TranslationKey,
  params?: InterpolationParams,
): string {
  const supported = asSupportedLocale(locale);
  const template =
    (supported ? CATALOGS[supported][key] : undefined) ?? en[key] ?? (key as string);
  return interpolate(template, params);
}

/**
 * Picks the first device locale we actually ship. `deviceLocales` is passed in
 * rather than read here, so this stays pure and testable.
 */
export function resolveInitialLocale(
  deviceLocales: readonly (string | null | undefined)[],
): SupportedLocale {
  for (const candidate of deviceLocales) {
    const match = asSupportedLocale(candidate);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export type { Catalog, TranslationKey };
