/**
 * PROOF that the layout actually mirrors — not that some strings changed.
 *
 * The styles under test are imported from `src/i18n/rtl-styles.ts`, i.e. the
 * very objects the app ships; the test does not restate them. They are pushed
 * through react-native-web's real StyleSheet and rendered with
 * `react-dom/server`, then the emitted CSS is read back and compared between
 * `dir="ltr"` and `dir="rtl"`.
 *
 * Calibration is part of the test: a physical `marginLeft` must NOT mirror,
 * and a non-RTL locale (cs) must produce exactly the LTR output. Without those
 * two controls, "it mirrored" would be unfalsifiable.
 *
 * What this CANNOT prove: native Yoga mirroring. `I18nManager.isRTL` is read
 * once from native constants and needs a real device plus an app restart.
 * See the notes in src/i18n/direction.ts.
 *
 * Run: cd mobile && bun test tests/rtl-mirroring.test.tsx
 */
import { describe, expect, it } from 'bun:test';
import React from 'react';
import { AppRegistry, StyleSheet, View } from 'react-native-web';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  avatarEditBadge,
  floatingActionButton,
  headerBackButton,
  toastAccentBar,
} from '../src/i18n/rtl-styles';
import { directionForLocale } from '../src/i18n/resolver';

/** A physical style that must never mirror — the control in the experiment. */
const physicalControl = { marginLeft: 24, position: 'absolute' as const, left: 7 };

const PROBES = {
  toastAccentBar,
  floatingActionButton,
  headerBackButton,
  avatarEditBadge,
  physicalControl,
};

type ProbeName = keyof typeof PROBES;

const PROBE_NAMES = Object.keys(PROBES) as ProbeName[];

const sheet = StyleSheet.create(PROBES as Record<string, object>);

let registered = 0;

/**
 * Renders every probe inside a `dir`-scoped root and returns, per probe, the
 * CSS declarations react-native-web actually emitted for it.
 */
function renderProbes(dir: 'ltr' | 'rtl'): Record<ProbeName, string> {
  const name = `RtlProbe${registered++}`;

  function Probes() {
    return (
      // `dir` is what drives mirroring in react-native-web — I18nManager is a
      // no-op stub there, so this is the only lever that exists.
      <View {...({ dir } as Record<string, never>)} style={{ flex: 1 }}>
        {PROBE_NAMES.map((probe) => (
          <View key={probe} style={sheet[probe]} />
        ))}
      </View>
    );
  }

  AppRegistry.registerComponent(name, () => Probes);
  const app = AppRegistry.getApplication(name, {}) as {
    element: React.ReactElement;
    getStyleElement: () => React.ReactElement;
  };

  const html = renderToStaticMarkup(app.element);
  const css = renderToStaticMarkup(app.getStyleElement());

  // The probe divs are the leaves, in declaration order.
  const classLists = [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1]);
  const leaves = classLists.slice(classLists.length - PROBE_NAMES.length);
  expect(leaves.length).toBe(PROBE_NAMES.length);

  const rules = new Map<string, string>();
  for (const m of css.matchAll(/\.([A-Za-z0-9_-]+)\{([^}]*)\}/g)) {
    rules.set(m[1], m[2]);
  }

  const out = {} as Record<ProbeName, string>;
  PROBE_NAMES.forEach((probe, index) => {
    const declarations = leaves[index]
      .split(/\s+/)
      .filter(Boolean)
      .map((cls) => rules.get(cls) ?? '')
      .join('');
    out[probe] = declarations;
  });
  return out;
}

const ltr = renderProbes('ltr');
const rtl = renderProbes('rtl');

describe('react-native-web is really doing the work', () => {
  it('emits CSS for every probe', () => {
    for (const probe of PROBE_NAMES) {
      expect(ltr[probe].length).toBeGreaterThan(0);
      expect(rtl[probe].length).toBeGreaterThan(0);
    }
  });
});

describe('logical styles mirror under dir="rtl"', () => {
  it('toast accent bar: start:0 → left in ltr, right in rtl', () => {
    expect(ltr.toastAccentBar).toContain('left:0px');
    expect(ltr.toastAccentBar).not.toContain('right:0px');

    expect(rtl.toastAccentBar).toContain('right:0px');
    expect(rtl.toastAccentBar).not.toContain('left:0px');
  });

  it('floating action button: end:20 → right in ltr, left in rtl', () => {
    expect(ltr.floatingActionButton).toContain('right:20px');
    expect(ltr.floatingActionButton).not.toContain('left:20px');

    expect(rtl.floatingActionButton).toContain('left:20px');
    expect(rtl.floatingActionButton).not.toContain('right:20px');
  });

  it('header back button: marginStart:-8 → margin-left in ltr, margin-right in rtl', () => {
    expect(ltr.headerBackButton).toContain('margin-left:-8px');
    expect(ltr.headerBackButton).not.toContain('margin-right:-8px');

    expect(rtl.headerBackButton).toContain('margin-right:-8px');
    expect(rtl.headerBackButton).not.toContain('margin-left:-8px');
  });

  it('avatar edit badge: end:0 → right in ltr, left in rtl', () => {
    expect(ltr.avatarEditBadge).toContain('right:0px');
    expect(rtl.avatarEditBadge).toContain('left:0px');
  });

  it('every logical probe differs between the two directions', () => {
    for (const probe of PROBE_NAMES.filter((p) => p !== 'physicalControl')) {
      expect(rtl[probe]).not.toBe(ltr[probe]);
    }
  });
});

describe('CALIBRATION — the test can tell mirrored from not-mirrored', () => {
  it('a physical marginLeft/left does NOT mirror (this is why logical props are required)', () => {
    expect(ltr.physicalControl).toContain('margin-left:24px');
    expect(rtl.physicalControl).toContain('margin-left:24px');
    expect(ltr.physicalControl).toContain('left:7px');
    expect(rtl.physicalControl).toContain('left:7px');
    expect(rtl.physicalControl).toBe(ltr.physicalControl);
  });

  it('a non-RTL locale (cs) produces exactly the LTR output — no false positive', () => {
    expect(directionForLocale('cs')).toBe('ltr');
    const czech = renderProbes(directionForLocale('cs'));
    for (const probe of PROBE_NAMES) {
      expect(czech[probe]).toBe(ltr[probe]);
    }
    // …and it is genuinely different from what Hebrew produces.
    expect(directionForLocale('he')).toBe('rtl');
    expect(czech.toastAccentBar).not.toBe(rtl.toastAccentBar);
  });
});
