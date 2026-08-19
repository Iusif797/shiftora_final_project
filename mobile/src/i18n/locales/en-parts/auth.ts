/**
 * English source strings — see src/i18n/locales/en.ts for how parts compose.
 *
 * Covers: welcome carousel, sign-in, sign-up, forgot/reset password,
 * onboarding (owner/employee path), index redirect screen, and the
 * not-found screen.
 */
export const enAuth = {
  // ── shared form fields ───────────────────────────────────────────────────
  'auth.field.emailLabel': 'Email',
  'auth.field.emailPlaceholder': 'you@restaurant.com',
  'auth.field.passwordLabel': 'Password',
  'auth.field.confirmPasswordLabel': 'Confirm password',
  'auth.field.confirmPasswordPlaceholder': 'Repeat your password',
  'auth.field.fullNameLabel': 'Full name',
  'auth.field.fullNamePlaceholder': 'Yusif Mamedov',
  'auth.field.newPasswordLabel': 'New password',
  'auth.field.restaurantNameLabel': 'Restaurant name',
  'auth.field.restaurantNamePlaceholder': 'The Grand Kitchen',
  'auth.field.inviteCodeLabel': 'Invitation code',
  'auth.field.inviteCodePlaceholder': 'ABCD1234',
  'auth.field.forgotPassword': 'Forgot password?',

  // ── shared navigation ────────────────────────────────────────────────────
  'auth.nav.backToSignIn': 'Back to sign in',

  // ── shared errors ────────────────────────────────────────────────────────
  'auth.error.sessionStartFailed': 'Unable to start your session. Try again.',
  'auth.error.invalidCredentials': 'Invalid email or password',
  'auth.error.networkGeneric': 'Network error. Check your connection and try again.',
  'auth.error.emailRequired': 'Enter your email to continue',
  'auth.error.emailInvalid': 'Enter a valid email address',
  'auth.error.passwordRequired': 'Enter your password',
  'auth.error.nameRequired': 'Enter your full name',
  'auth.error.accountCreateFailed': 'Unable to create account',
  'auth.error.passwordTooShort': 'Password must be at least 10 characters',
  'auth.error.passwordMismatch': 'Passwords do not match',
  'auth.error.passwordTooShortPeriod': 'Password must be at least 10 characters.',
  'auth.error.passwordTooLong': 'Password must be 128 characters or fewer.',
  'auth.error.passwordMismatchPeriod': 'Passwords do not match.',
  'auth.error.resetLinkInvalid': 'This reset link is invalid or expired.',
  'auth.error.resetPasswordFailed': 'Could not reset your password. Try again.',
  'auth.error.resetEmailFailed': 'Could not send the reset email. Check your connection and try again.',
  'auth.error.restaurantNameRequired': 'Enter your restaurant name',
  'auth.error.restaurantCreateFailed': 'Failed to create restaurant',
  'auth.error.inviteCodeRequired': 'Enter the invitation code',
  'auth.error.inviteCodeInvalid': 'Invalid or expired code',
  'auth.error.joinRestaurantFailed': 'Failed to join restaurant',

  // ── welcome carousel ─────────────────────────────────────────────────────
  'auth.welcome.slide1Title': 'Manage shifts easily',
  'auth.welcome.slide1Subtitle': 'Plan and track team schedules',
  'auth.welcome.slide2Title': 'Track attendance',
  'auth.welcome.slide2Subtitle': 'Check-in and monitor staff presence',
  'auth.welcome.slide3Title': 'Team analytics',
  'auth.welcome.slide3Subtitle': 'See performance and staffing insights',
  'auth.welcome.enter': 'Enter Shiftora',
  'auth.welcome.skipToSignIn': 'Skip to sign in',

  // ── sign in ──────────────────────────────────────────────────────────────
  'auth.signIn.badge': 'Welcome back',
  'auth.signIn.title': 'Sign in to Shiftora',
  'auth.signIn.subtitle': 'Use your email and password to enter your workspace.',
  'auth.signIn.passwordPlaceholder': 'Enter your password',
  'auth.signIn.submit': 'Continue',
  'auth.signIn.newToShiftora': 'New to Shiftora?',
  'auth.signIn.createAccount': 'Create account',

  // ── sign up ──────────────────────────────────────────────────────────────
  'auth.signUp.badge': 'Create workspace access',
  'auth.signUp.title': 'Create your account',
  'auth.signUp.subtitle': 'Sign up once, then choose whether you own a restaurant or are joining a team.',
  'auth.signUp.passwordPlaceholder': 'Create a strong password',
  'auth.signUp.submit': 'Create account',
  'auth.signUp.legalAgree': 'By creating an account, you agree to the',
  'auth.signUp.termsLink': 'Terms',
  'auth.signUp.legalAnd': 'and acknowledge the',
  'auth.signUp.alreadyHaveAccount': 'Already have an account?',
  'auth.signUp.signInInstead': 'Sign in instead',

  // ── forgot password ──────────────────────────────────────────────────────
  'auth.forgotPassword.title': 'Reset password',
  'auth.forgotPassword.subtitleSuccess': 'If an account exists for that email, a 60-minute reset link is on its way.',
  'auth.forgotPassword.subtitle': 'Enter your account email and we’ll send a secure reset link.',
  'auth.forgotPassword.submit': 'Send reset link',

  // ── reset password ───────────────────────────────────────────────────────
  'auth.resetPassword.title': 'Choose a new password',
  'auth.resetPassword.subtitle': 'Use at least 10 characters and avoid passwords you use elsewhere.',
  'auth.resetPassword.submit': 'Update password',
  'auth.resetPassword.requestNewLink': 'Request a new link',

  // ── onboarding ───────────────────────────────────────────────────────────
  'auth.onboarding.getStartedBadge': 'Get started',
  'auth.onboarding.pathTitle': 'How will you use Shiftora?',
  'auth.onboarding.pathSubtitle': "We'll set up the right workspace for your role.",
  'auth.onboarding.ownerTitle': 'I own a restaurant',
  'auth.onboarding.ownerSubtitle': 'Create your workspace and invite your team',
  'auth.onboarding.employeeTitle': "I'm joining a team",
  'auth.onboarding.employeeSubtitle': 'Use an invite code from your manager',
  'auth.onboarding.ownerBadge': 'Restaurant Owner',
  'auth.onboarding.ownerSetupTitle': 'Create your restaurant',
  'auth.onboarding.ownerSetupSubtitle': 'Set up your workspace and start managing your team.',
  'auth.onboarding.createRestaurant': 'Create restaurant',
  'auth.onboarding.joinTeamBadge': 'Join team',
  'auth.onboarding.inviteCodeTitle': 'Enter invite code',
  'auth.onboarding.inviteCodeSubtitle': 'Your restaurant owner or manager shared a code with you.',
  'auth.onboarding.verifyCode': 'Verify code',
  'auth.onboarding.confirmBadge': 'Confirm',
  'auth.onboarding.joinTitle': 'Join {restaurantName}',
  'auth.onboarding.invitedAs': "You've been invited as {roleText}.",
  'auth.onboarding.invitedAsManager': 'a shift manager',
  'auth.onboarding.invitedAsMember': 'a team member',
  'auth.onboarding.roleLine': 'Role: {role}',
  'auth.onboarding.roleLabelManager': 'Shift Manager',
  'auth.onboarding.roleLabelMember': 'Team Member',
  'auth.onboarding.joinRestaurant': 'Join restaurant',

  // ── not found ─────────────────────────────────────────────────────────────
  'auth.notFound.title': 'Not Found',
  'auth.notFound.message': "This screen doesn't exist.",
  'auth.notFound.goHome': 'Go to home screen',
} satisfies Record<string, string>;
