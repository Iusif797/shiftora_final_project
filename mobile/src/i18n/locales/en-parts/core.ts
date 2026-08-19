/**
 * English source strings — app shell, navigation, shared controls.
 *
 * This file is one of the parts composed into `src/i18n/locales/en.ts`,
 * which is the single source of truth for the key set. Every other locale
 * is typed `Catalog`, so TypeScript refuses to compile a locale that is
 * missing a key defined here.
 */
export const enCore = {
  'app.name': 'Shiftora',

  // ── generic actions ──────────────────────────────────────────────────────
  'common.ok': 'OK',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.delete': 'Delete',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.done': 'Done',
  'common.retry': 'Try again',
  'common.loading': 'Loading…',
  'common.later': 'Later',
  'common.confirm': 'Confirm',
  'common.search': 'Search',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.error': 'Something went wrong',

  // ── connectivity ─────────────────────────────────────────────────────────
  'net.offline': 'No internet connection',

  // ── bottom tabs ──────────────────────────────────────────────────────────
  'tabs.home': 'Home',
  'tabs.dashboard': 'Dashboard',
  'tabs.schedule': 'Schedule',
  'tabs.floor': 'Floor',
  'tabs.kitchen': 'Kitchen',
  'tabs.team': 'Team',
  'tabs.analytics': 'Analytics',
  'tabs.profile': 'Profile',

  // ── roles ────────────────────────────────────────────────────────────────
  'role.owner': 'Owner',
  'role.manager': 'Manager',
  'role.employee': 'Employee',

  // ── dates and greetings ──────────────────────────────────────────────────
  'time.today': 'Today',
  'time.tomorrow': 'Tomorrow',
  'greeting.morning': 'Good morning',
  'greeting.afternoon': 'Good afternoon',
  'greeting.evening': 'Good evening',

  // ── language switcher ────────────────────────────────────────────────────
  'lang.title': 'Language',
  'lang.subtitle': 'Choose the language of the app',
  'lang.restartTitle': 'Restart needed',
  'lang.restartBody':
    'Switching to {language} mirrors the whole layout. The app has to restart for the new direction to take effect.',
  'lang.restartNow': 'Restart now',
  'lang.restartManual': 'Please close the app completely and open it again to finish switching to {language}.',

  // ── profile / user menu ──────────────────────────────────────────────────
  'user.menuTitle': 'Account',
  'user.profile': 'Profile',
  'user.settings': 'Settings',
  'user.signOut': 'Sign out',
  'user.signOutConfirmTitle': 'Sign out?',
  'user.signOutConfirmBody': 'You will need to sign in again to reach your schedule.',

  // ── legal ────────────────────────────────────────────────────────────────
  'legal.lastUpdated': 'Last updated {date}',
  'legal.privacyTitle': 'Privacy Policy',
  'legal.termsTitle': 'Terms of Service',
  'legal.englishOnlyNotice': 'This document is legally binding and is currently available in English only.',

  // ── accessibility ────────────────────────────────────────────────────────
  'a11y.language.button': 'Language: {language}. Change language',
  'a11y.language.option': '{language}',
  'a11y.user.button': 'Account menu',
  'a11y.back': 'Go back',
  'a11y.close': 'Close',
} satisfies Record<string, string>;
