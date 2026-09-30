/**
 * The direction-switch DECISION, isolated from the side effects that carry it
 * out, so it can be unit-tested without a device.
 *
 * Measured behaviour this encodes (react-native 0.86 / react-native-web 0.21):
 *  • Native: `I18nManager.isRTL` is read once, at module load, from native
 *    constants. `forceRTL()` persists the flag but does NOT re-lay-out the
 *    running app — a full restart is mandatory before the flip is visible.
 *  • Web: react-native-web's `I18nManager` is a no-op stub (`isRTL` is
 *    hardcoded `false`, `forceRTL()` returns immediately). Direction comes
 *    only from the `dir` attribute, and it applies instantly — no restart.
 */
import type { Direction } from './resolver';

export type Runtime = 'web' | 'native';

export interface DirectionPlan {
  direction: Direction;
  /** What to hand `I18nManager.allowRTL`/`forceRTL`. `null` on web: no-op there. */
  forceNativeRTL: boolean | null;
  /** True only when the running native layout does not match the wanted one. */
  restartRequired: boolean;
  /** What to write to `document.documentElement.dir`. `null` on native. */
  webDir: Direction | null;
}

export function planDirectionChange(
  direction: Direction,
  runtime: Runtime,
  nativeIsRTL: boolean,
): DirectionPlan {
  if (runtime === 'web') {
    return { direction, forceNativeRTL: null, restartRequired: false, webDir: direction };
  }

  const wantRTL = direction === 'rtl';
  return {
    direction,
    forceNativeRTL: wantRTL,
    restartRequired: wantRTL !== nativeIsRTL,
    webDir: null,
  };
}
