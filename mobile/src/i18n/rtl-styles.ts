/**
 * The direction-sensitive styles of the app, in one pure module.
 *
 * Two reasons this is not inlined at each call site:
 *  1. These are the styles that MUST use logical props (`start`/`end`,
 *    `marginStart`/`marginEnd`) rather than physical ones. Having them
 *    together makes it obvious when a new physical `left:`/`right:` sneaks in.
 *  2. No react-native import at runtime (the `ViewStyle` import is type-only,
 *    erased at compile time), so `tests/rtl-mirroring.test.tsx` can feed these
 *    exact objects through react-native-web and prove the emitted CSS mirrors.
 *    The test therefore proves the shipped styles, not a copy of them.
 *
 * Measured (react-native-web 0.21):
 *   marginStart: 24  →  ltr `margin-left:24px`   rtl `margin-right:24px`
 *   start: 0         →  ltr `left:0px`           rtl `right:0px`
 *   marginLeft: 24   →  ltr `margin-left:24px`   rtl `margin-left:24px`  (never mirrors)
 */
import type { TextStyle, ViewStyle } from 'react-native';

/** Coloured accent bar down the leading edge of a toast. */
export const toastAccentBar: ViewStyle = {
  position: 'absolute',
  start: 0,
  top: 0,
  bottom: 0,
  width: 3,
};

/** Floating "add shift" button — trailing bottom corner. */
export const floatingActionButton: ViewStyle = {
  position: 'absolute',
  end: 20,
  bottom: 100,
};

/** Back chevron in a screen header: pulled into the screen's leading padding. */
export const headerBackButton: ViewStyle = {
  zIndex: 999,
  padding: 8,
  marginStart: -8,
};

/** Camera badge overlapping the trailing bottom corner of the avatar. */
export const avatarEditBadge: ViewStyle = {
  position: 'absolute',
  end: 0,
  bottom: 0,
};

/**
 * Trailing-aligned text (e.g. "Forgot password?").
 * `textAlign` has no logical value in react-native's types — 'auto' | 'left' |
 * 'right' | 'center' | 'justify' only — so this one has to be driven from the
 * active direction instead of by the layout engine.
 */
export function trailingText(isRTL: boolean): TextStyle {
  return { textAlign: isRTL ? 'left' : 'right' };
}

/**
 * A chevron used as a directional affordance (back / forward / "open") points
 * the other way in a mirrored layout. Icons are drawn, not laid out, so Yoga
 * will not do this for us.
 */
export function mirrorIcon(isRTL: boolean): ViewStyle {
  return isRTL ? { transform: [{ scaleX: -1 }] } : {};
}

/**
 * `dir` is a react-native-web-only prop — it is what actually mirrors logical
 * styles in the browser, and native simply ignores it. React Native's types do
 * not know it, hence the cast, kept in one place instead of at every use.
 */
export function dirProp(direction: 'ltr' | 'rtl'): Record<string, never> {
  return { dir: direction } as unknown as Record<string, never>;
}
