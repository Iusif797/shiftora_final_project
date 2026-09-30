/**
 * The active locale as a module-level value.
 *
 * React components read the locale through `useI18n()`. Plain modules
 * (formatters, toast helpers, API error mapping) cannot use hooks, so
 * `I18nProvider` mirrors its state here and those modules translate through
 * `translate()`. One writer (the provider), many readers.
 */
import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  resolveTranslation,
  type InterpolationParams,
  type SupportedLocale,
  type TranslationKey,
} from './resolver';

let activeLocale: SupportedLocale = DEFAULT_LOCALE;

export function setActiveLocale(locale: SupportedLocale): void {
  activeLocale = locale;
}

export function getActiveLocale(): SupportedLocale {
  return activeLocale;
}

/** BCP-47 tag of the active locale, for `Intl` / `toLocale*String`. */
export function getActiveBcp47(): string {
  return LOCALE_BCP47[activeLocale];
}

/** Translate outside React. Inside components prefer `useT()`. */
export function translate(key: TranslationKey, params?: InterpolationParams): string {
  return resolveTranslation(activeLocale, key, params);
}
