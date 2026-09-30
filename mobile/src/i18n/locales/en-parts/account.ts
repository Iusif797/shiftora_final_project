/**
 * English source strings — see src/i18n/locales/en.ts for how parts compose.
 *
 * Covers: profile screen, restaurant settings screen, account deletion,
 * connection/error fallbacks, and the employee/shift edit modals.
 */
export const enAccount = {
  // ── profile screen ───────────────────────────────────────────────────────
  'account.profile.title': 'Profile',
  'account.profile.loadError': 'Could not load profile',
  'account.profile.fullNameLabel': 'Full Name',
  'account.profile.namePlaceholder': 'Enter your name',
  'account.profile.emailLabel': 'Email Address',
  'account.profile.editProfile': 'Edit Profile',
  'account.profile.restaurantSettings': 'Restaurant settings',

  // ── settings screen ──────────────────────────────────────────────────────
  'account.settings.title': 'Settings',
  'account.settings.subtitle': 'Your profile, restaurant, and workspace security',
  'account.settings.restaurantHeading': 'Restaurant',
  'account.settings.copyRestaurantId': 'Copy restaurant ID',
  'account.settings.field.name': 'Restaurant name',
  'account.settings.field.address': 'Address',
  'account.settings.field.timezone': 'Timezone',
  'account.settings.field.taxRate': 'Tax rate (%)',
  'account.settings.geofenceLabel': 'Check-in geofence: {status}',
  'account.settings.geofenceConfigured': 'configured (500 m radius)',
  'account.settings.geofenceNotConfigured': 'not configured',
  'account.settings.useCurrentLocation': 'Use current restaurant location',
  'account.settings.disableGeofence': 'Disable geofence',
  'account.settings.saveRestaurantSettings': 'Save restaurant settings',
  'account.settings.noRestaurantTitle': 'No restaurant linked',
  'account.settings.noRestaurantDescription': 'Ask your owner for the restaurant ID to join the workspace.',
  'account.settings.privacy': 'Privacy',
  'account.settings.terms': 'Terms',
  'account.settings.footer': 'Shiftora v1.0 · Secure workspace',
  'account.settings.error.nameRequired': 'Restaurant name is required',
  'account.settings.error.taxRange': 'Tax must be between 0 and 100 percent',
  'account.settings.toast.updatedTitle': 'Restaurant updated',
  'account.settings.toast.updatedBody': 'Settings are now active',
  'account.settings.toast.saveFailedTitle': 'Could not save settings',
  'account.settings.toast.locationPermissionTitle': 'Location permission needed',
  'account.settings.toast.locationPermissionBody': 'Allow location access to set the check-in geofence.',
  'account.settings.toast.locationCapturedTitle': 'Location captured',
  'account.settings.toast.locationCapturedBody': 'Save settings to activate the check-in geofence.',

  // ── delete account ───────────────────────────────────────────────────────
  'account.delete.button': 'Delete account',
  'account.delete.deleting': 'Deleting account…',
  'account.delete.footerNote': 'Deletes your account and its data permanently. This cannot be undone.',
  'account.delete.confirmTitle': 'Delete account?',
  'account.delete.confirmBodyOwner':
    'Your account will be deleted permanently. Because you own this restaurant, the restaurant and all of its data — shifts, check-ins, menu, tables, orders and invitations — are deleted with it. Employees keep their own accounts but lose access to this workspace.',
  'account.delete.confirmBodyEmployee':
    'Your account will be deleted permanently, together with your check-ins, shift assignments and profile data. This cannot be undone.',
  'account.delete.finalConfirmTitle': 'Delete account permanently?',
  'account.delete.finalConfirmBody': 'This is the final confirmation. The account cannot be restored afterwards.',
  'account.delete.deletePermanently': 'Delete permanently',
  'account.delete.toast.successTitle': 'Account deleted',
  'account.delete.toast.successBody': 'Your account and its data have been permanently removed.',
  'account.delete.toast.errorTitle': 'Could not delete account',

  // ── connection / boundary fallbacks ──────────────────────────────────────
  'account.error.connectionTitle': "Can't reach the server",
  'account.error.connectionBody':
    'Check your internet connection and try again. The server may take a moment to wake up.',
  'account.error.restart': 'Restart',
  'account.error.sessionExpired': 'Session expired',
  'account.error.featureUnavailable': 'This feature is not available for your workspace',
  'account.error.requestFailed': 'Request failed',
  'account.error.updateFailed': 'Update failed',

  // ── employee edit modal ──────────────────────────────────────────────────
  'account.employee.toast.updated': 'Employee updated',
  'account.employee.positionLabel': 'Position',
  'account.employee.positionPlaceholder': 'Server, bartender...',
  'account.employee.hourlyRateLabel': 'Hourly rate',
  'account.employee.hourlyRatePlaceholder': '15.00',
  'account.employee.activeLabel': 'Active employee',

  // ── shift edit modal ─────────────────────────────────────────────────────
  'account.shift.editTitle': 'Edit shift',
  'account.shift.field.title': 'Shift title',
  'account.shift.field.date': 'Date',
  'account.shift.field.start': 'Start time',
  'account.shift.field.end': 'End time',
  'account.shift.notesLabel': 'Notes',
  'account.shift.saveChanges': 'Save changes',
  'account.shift.cancelShift': 'Cancel shift',
  'account.shift.deleteShift': 'Delete shift',
  'account.shift.toast.updated': 'Shift updated',
  'account.shift.toast.cancelled': 'Shift cancelled',
  'account.shift.toast.deleted': 'Shift deleted',
  'account.shift.toast.cancelFailedTitle': 'Cancel failed',
  'account.shift.toast.deleteFailedTitle': 'Delete failed',
} satisfies Record<string, string>;
