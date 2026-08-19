/**
 * i18n core: catalog completeness, interpolation, locale resolution and the
 * direction plan. Everything under test here is pure, so it runs without a
 * device, a bundler or a React renderer.
 *
 * Run: cd mobile && bun test tests/i18n.test.ts
 */
import { describe, expect, it } from 'bun:test';

import { en } from '../src/i18n/locales/en';
import {
  CATALOGS,
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  LOCALE_NATIVE_NAMES,
  SUPPORTED_LOCALES,
  asSupportedLocale,
  directionForLocale,
  interpolate,
  isRtlLocale,
  resolveInitialLocale,
  resolveTranslation,
  type SupportedLocale,
} from '../src/i18n/resolver';
import { planDirectionChange } from '../src/i18n/direction';
import { readDeviceLocales } from '../src/i18n/device-locale';

const ENGLISH_KEYS = Object.keys(en).sort();
const NON_ENGLISH: SupportedLocale[] = SUPPORTED_LOCALES.filter((l) => l !== 'en');

describe('catalog completeness', () => {
  it('ships a non-trivial English catalog', () => {
    expect(ENGLISH_KEYS.length).toBeGreaterThan(50);
  });

  // The `Catalog` type already forces this at compile time. Asserting it again
  // at runtime is not redundant: a catalog can be built by spreading, cast, or
  // edited by a tool that never runs tsc.
  for (const locale of SUPPORTED_LOCALES) {
    it(`${locale} defines every English key`, () => {
      const catalog = CATALOGS[locale];
      const missing = ENGLISH_KEYS.filter((key) => !(key in catalog));
      expect(missing).toEqual([]);
    });

    it(`${locale} has no empty or non-string values`, () => {
      const catalog = CATALOGS[locale] as Record<string, unknown>;
      const bad = ENGLISH_KEYS.filter(
        (key) => typeof catalog[key] !== 'string' || (catalog[key] as string).trim() === '',
      );
      expect(bad).toEqual([]);
    });

    it(`${locale} defines no key English does not have`, () => {
      const extra = Object.keys(CATALOGS[locale]).filter((key) => !(key in en));
      expect(extra).toEqual([]);
    });

    it(`${locale} keeps every {placeholder} used by the English string`, () => {
      const catalog = CATALOGS[locale] as Record<string, string>;
      const source = en as Record<string, string>;
      const broken: string[] = [];
      for (const key of ENGLISH_KEYS) {
        const wanted = [...source[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        const got = [...catalog[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        if (wanted.join(',') !== got.join(',')) broken.push(`${key}: want ${wanted} got ${got}`);
      }
      expect(broken).toEqual([]);
    });
  }

  // Guards against a "translation" that is really the English file copied over.
  const SENTINELS = [
    'common.cancel',
    'common.save',
    'common.retry',
    'tabs.schedule',
    'tabs.kitchen',
    'greeting.morning',
    'time.today',
  ] as const;

  for (const locale of NON_ENGLISH) {
    it(`${locale} is actually translated, not an English copy`, () => {
      const catalog = CATALOGS[locale] as Record<string, string>;
      const source = en as Record<string, string>;
      const untranslated = SENTINELS.filter((key) => catalog[key] === source[key]);
      expect(untranslated).toEqual([]);
    });
  }

  it('names every locale in its own writing and maps it to a BCP-47 tag', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_NATIVE_NAMES[locale].length).toBeGreaterThan(0);
      expect(LOCALE_BCP47[locale]).toContain(locale === 'en' ? 'en' : locale);
    }
  });
});

describe('interpolate', () => {
  it('substitutes a {param}', () => {
    expect(interpolate('Language: {language}', { language: 'עברית' })).toBe('Language: עברית');
  });

  it('substitutes several, including repeats', () => {
    expect(interpolate('{a} then {b} then {a}', { a: '1', b: '2' })).toBe('1 then 2 then 1');
  });

  it('accepts numbers', () => {
    expect(interpolate('{count} shifts', { count: 3 })).toBe('3 shifts');
  });

  it('leaves an unknown placeholder alone rather than printing undefined', () => {
    expect(interpolate('Hi {name}', { other: 'x' })).toBe('Hi {name}');
  });

  it('is a no-op without params', () => {
    expect(interpolate('Hi {name}')).toBe('Hi {name}');
  });
});

describe('isRtlLocale', () => {
  it('is true for Hebrew', () => {
    expect(isRtlLocale('he')).toBe(true);
    expect(directionForLocale('he')).toBe('rtl');
  });

  for (const locale of ['cs', 'sk', 'pl', 'ru', 'uk', 'en'] as const) {
    it(`is false for ${locale}`, () => {
      expect(isRtlLocale(locale)).toBe(false);
      expect(directionForLocale(locale)).toBe('ltr');
    });
  }
});

describe('asSupportedLocale', () => {
  it('accepts a bare code', () => {
    expect(asSupportedLocale('cs')).toBe('cs');
  });

  it('accepts BCP-47 and underscore forms', () => {
    expect(asSupportedLocale('he-IL')).toBe('he');
    expect(asSupportedLocale('cs_CZ')).toBe('cs');
    expect(asSupportedLocale('EN-GB')).toBe('en');
  });

  it('maps the legacy Hebrew code iw', () => {
    expect(asSupportedLocale('iw-IL')).toBe('he');
  });

  it('rejects what we do not ship', () => {
    expect(asSupportedLocale('de-DE')).toBeNull();
    expect(asSupportedLocale('')).toBeNull();
    expect(asSupportedLocale(null)).toBeNull();
    expect(asSupportedLocale(42)).toBeNull();
  });
});

describe('resolveTranslation', () => {
  it('returns the locale string', () => {
    expect(resolveTranslation('en', 'common.cancel')).toBe(en['common.cancel']);
  });

  it('interpolates params', () => {
    const out = resolveTranslation('en', 'a11y.language.button', { language: 'English' });
    expect(out).toBe('Language: English. Change language');
    expect(out).not.toContain('{');
  });

  it('falls back to English for an unknown locale', () => {
    expect(resolveTranslation('de', 'common.cancel')).toBe(en['common.cancel']);
  });

  it('falls back to the raw key when nothing has the string', () => {
    // Deliberately bypassing the type to simulate a stale key left in the UI.
    const missing = 'this.key.does.not.exist' as never;
    expect(resolveTranslation('cs', missing)).toBe('this.key.does.not.exist');
  });
});

describe('resolveInitialLocale', () => {
  it('picks the first device locale we ship', () => {
    expect(resolveInitialLocale(['he-IL', 'en-US'])).toBe('he');
    expect(resolveInitialLocale(['cs-CZ'])).toBe('cs');
  });

  it('skips locales we do not ship', () => {
    expect(resolveInitialLocale(['de-DE', 'fr-FR', 'uk-UA'])).toBe('uk');
  });

  it('falls back to the default when nothing matches', () => {
    expect(resolveInitialLocale(['de-DE', 'fr-FR'])).toBe(DEFAULT_LOCALE);
    expect(resolveInitialLocale([])).toBe(DEFAULT_LOCALE);
  });

  it('tolerates null and undefined entries', () => {
    expect(resolveInitialLocale([null, undefined, 'pl'])).toBe('pl');
  });
});

describe('readDeviceLocales', () => {
  it('reads the tag out of Intl', () => {
    const intl = {
      DateTimeFormat: () => ({ resolvedOptions: () => ({ locale: 'ru-RU' }) }),
    } as unknown as typeof Intl;
    expect(readDeviceLocales({ intl, navigator: undefined })).toEqual(['ru-RU']);
  });

  it('adds the browser languages when there is a navigator', () => {
    const intl = {
      DateTimeFormat: () => ({ resolvedOptions: () => ({ locale: 'en-US' }) }),
    } as unknown as typeof Intl;
    expect(readDeviceLocales({ intl, navigator: { languages: ['he-IL', 'en'] } })).toEqual([
      'en-US',
      'he-IL',
      'en',
    ]);
  });

  it('survives a Hermes build with no ICU data', () => {
    const intl = {
      DateTimeFormat: () => {
        throw new Error('no ICU');
      },
    } as unknown as typeof Intl;
    expect(readDeviceLocales({ intl, navigator: undefined })).toEqual([]);
    expect(resolveInitialLocale(readDeviceLocales({ intl, navigator: undefined }))).toBe(
      DEFAULT_LOCALE,
    );
  });

  it('returns something on this runtime', () => {
    // Not a claim about the device — only that the real code path yields a
    // usable tag wherever a full-ICU JS engine is present.
    const real = readDeviceLocales();
    expect(Array.isArray(real)).toBe(true);
    for (const tag of real) expect(typeof tag).toBe('string');
  });
});

describe('planDirectionChange', () => {
  it('web + he: sets dir, never restarts, never touches I18nManager', () => {
    expect(planDirectionChange('rtl', 'web', false)).toEqual({
      direction: 'rtl',
      forceNativeRTL: null,
      restartRequired: false,
      webDir: 'rtl',
    });
  });

  it('web + en: same, ltr', () => {
    expect(planDirectionChange('ltr', 'web', false)).toEqual({
      direction: 'ltr',
      forceNativeRTL: null,
      restartRequired: false,
      webDir: 'ltr',
    });
  });

  it('native + he from an ltr layout: forces RTL and demands a restart', () => {
    expect(planDirectionChange('rtl', 'native', false)).toEqual({
      direction: 'rtl',
      forceNativeRTL: true,
      restartRequired: true,
      webDir: null,
    });
  });

  it('native + he when already mirrored: no restart', () => {
    expect(planDirectionChange('rtl', 'native', true)).toEqual({
      direction: 'rtl',
      forceNativeRTL: true,
      restartRequired: false,
      webDir: null,
    });
  });

  it('native + en from a mirrored layout: unforces and demands a restart', () => {
    expect(planDirectionChange('ltr', 'native', true)).toEqual({
      direction: 'ltr',
      forceNativeRTL: false,
      restartRequired: true,
      webDir: null,
    });
  });

  it('native + en when already ltr: nothing to do', () => {
    expect(planDirectionChange('ltr', 'native', false)).toEqual({
      direction: 'ltr',
      forceNativeRTL: false,
      restartRequired: false,
      webDir: null,
    });
  });
});
