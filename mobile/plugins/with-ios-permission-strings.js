/**
 * with-ios-permission-strings — Apple App Review, Guideline 4 (Design).
 *
 * Build 1.0 (10) was rejected because the iOS permission prompts were not written
 * in the same language as the app. Two separate causes were found by unpacking the
 * shipped .ipa and reading Payload/Shiftora.app/Info.plist:
 *
 *   1. NSCamera / NSLocationWhenInUse / NSPhotoLibrary usage descriptions were set
 *      in Russian in app.json, while the app UI and CFBundleDevelopmentRegion are
 *      English. Those three strings are now English in app.json.
 *
 *   2. A number of *placeholder* usage descriptions were injected into Info.plist by
 *      autolinked Expo / React Native modules that ship in the project template but
 *      that the app never imports (expo-calendar, expo-contacts, expo-sensors,
 *      react-native-vision-camera, ...). They read "Allow Shiftora to access your
 *      contacts" etc. — wording we do not control and cannot localize, for APIs the
 *      app never calls. Declaring a permission the app never requests is also an
 *      App Review risk in its own right (Guideline 5.1.1 — Data Minimization).
 *      This plugin removes them from the generated Info.plist.
 *
 * The list below is deliberately not speculative: it is exactly the set of keys that
 * were observed in the shipped build 9/10 Info.plist and that no source file in src/
 * ever uses. Re-check with `bunx expo config --type introspect` after upgrading Expo
 * or adding a native module.
 *
 * Note on localization: Shiftora's UI is English-only (there is no i18n layer in
 * src/), so the app declares CFBundleLocalizations = ["en"] and the base Info.plist
 * strings are English. If the app later gains a real i18n layer, add per-language
 * <lang>.lproj/InfoPlist.strings files and extend CFBundleLocalizations to match the
 * languages the UI actually ships — the prompts must always match what the user sees
 * on screen.
 */

const { withInfoPlist } = require('expo/config-plugins');

/** Usage descriptions injected by unused modules. Removed from the built Info.plist.
 *
 * WARNING (2026-08-13, after build 11 was refused with 3x ITMS-90683): deleting a key
 * from this list is NOT enough. expo-calendar and expo-contacts were still listed in
 * package.json, so they were autolinked and Apple's static analysis found the API
 * references in the compiled binary even though the purpose strings were gone.
 * Both packages are therefore removed from package.json itself; this list only stays
 * as a guard in case someone adds them back.
 *
 * NSMotionUsageDescription used to be in this list, filed under "expo-sensors".
 * That was wrong: expo-sensors was never a dependency of this app. The key comes from
 * **expo-location**, which the app does use (check-in). It must NOT be stripped, and
 * it is declared with an English purpose string in app.json.
 */
const UNUSED_USAGE_DESCRIPTIONS = [
  // expo-calendar / expo-contacts — removed from package.json on 2026-08-13.
  "NSCalendarsUsageDescription",
  "NSCalendarsFullAccessUsageDescription",
  "NSCalendarsWriteOnlyAccessUsageDescription",
  "NSRemindersUsageDescription",
  "NSRemindersFullAccessUsageDescription",
  "NSContactsUsageDescription",
  // react-native-vision-camera / expo-camera audio capture — the app only scans QR
  // codes with expo-camera's CameraView and never records audio or video.
  "NSMicrophoneUsageDescription",
  // expo-location background modes — checkin.ts only calls the when-in-use API.
  // Do NOT add NSMotionUsageDescription here: Apple requires it for expo-location.
  "NSLocationAlwaysUsageDescription",
  "NSLocationAlwaysAndWhenInUseUsageDescription",
];

module.exports = function withIosPermissionStrings(config) {
  return withInfoPlist(config, (cfg) => {
    for (const key of UNUSED_USAGE_DESCRIPTIONS) {
      delete cfg.modResults[key];
    }
    return cfg;
  });
};
