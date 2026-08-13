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

/** Usage descriptions injected by unused modules. Removed from the built Info.plist. */
const UNUSED_USAGE_DESCRIPTIONS = [
  // expo-calendar — not imported anywhere in src/
  'NSCalendarsUsageDescription',
  'NSCalendarsFullAccessUsageDescription',
  'NSCalendarsWriteOnlyAccessUsageDescription',
  'NSRemindersUsageDescription',
  'NSRemindersFullAccessUsageDescription',
  // expo-contacts — not imported anywhere in src/
  'NSContactsUsageDescription',
  // expo-sensors — not imported anywhere in src/
  'NSMotionUsageDescription',
  // react-native-vision-camera / expo-camera audio capture — the app only scans QR
  // codes with expo-camera's CameraView and never records audio or video.
  'NSMicrophoneUsageDescription',
  // expo-location background modes — checkin.ts only calls the when-in-use API.
  'NSLocationAlwaysUsageDescription',
  'NSLocationAlwaysAndWhenInUseUsageDescription',
];

module.exports = function withIosPermissionStrings(config) {
  return withInfoPlist(config, (cfg) => {
    for (const key of UNUSED_USAGE_DESCRIPTIONS) {
      delete cfg.modResults[key];
    }
    return cfg;
  });
};

module.exports.UNUSED_USAGE_DESCRIPTIONS = UNUSED_USAGE_DESCRIPTIONS;
