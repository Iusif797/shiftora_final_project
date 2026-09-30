import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowRight, UserPlus } from 'lucide-react-native';
import { directionalIcon } from '@/components/ui/directional-icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBackground, GlassPanel } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormField } from '@/components/form-field';
import { authClient } from '@/lib/auth/auth-client';
import { resolvePostAuthPath } from '@/lib/auth/post-auth';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { useT } from '@/i18n/I18nProvider';
import { colors, radius, spacing, typography } from '@/theme';

/** "Continue" arrow — a directional affordance, so it flips under RTL. */
const ForwardArrow = directionalIcon(ArrowRight);

type FocusedField = 'name' | 'email' | 'password' | 'confirmPassword' | null;

export default function SignUp() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const invalidateSession = useInvalidateSession();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const finishAuth = async () => {
    await invalidateSession();
    const nextPath = await resolvePostAuthPath();

    if (!nextPath) {
      setError(t('auth.error.sessionStartFailed'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/');
  };

  const signUpMutation = useMutation({
    mutationFn: async () =>
      authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      }),
    onSuccess: async (result) => {
      if (result.error) {
        setError(result.error.message || t('auth.error.accountCreateFailed'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      await finishAuth();
    },
    onError: () => {
      setError(t('auth.error.networkGeneric'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleSignUp = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError(t('auth.error.nameRequired'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!trimmedEmail) {
      setError(t('auth.error.emailRequired'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError(t('auth.error.emailInvalid'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password.length < 10) {
      setError(t('auth.error.passwordTooShort'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.error.passwordMismatch'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signUpMutation.mutate();
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.xxl,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.xxxl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          testID="sign-up-screen"
        >
          <SecondaryButton label={t('auth.nav.backToSignIn')} onPress={() => router.replace('/sign-in')} testID="back-button" />

          <View style={{ flex: 1, justifyContent: 'center', paddingTop: spacing.xxxl }}>
            <AccentBadge label={t('auth.signUp.badge')} color={colors.brand.gold} tint={colors.warning.muted} />

            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.xl }}>
              {t('auth.signUp.title')}
            </Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.md }}>
              {t('auth.signUp.subtitle')}
            </Text>

            <GlassPanel>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: radius.xxl,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(231,177,95,0.14)',
                  borderWidth: 1,
                  borderColor: colors.warning.border,
                  alignSelf: 'center',
                  marginBottom: spacing.xl,
                }}
              >
                <UserPlus color={colors.brand.gold} size={28} strokeWidth={1.9} />
              </View>

              <View style={{ gap: spacing.lg }}>
                <FormField
                  label={t('auth.field.fullNameLabel')}
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    if (error) setError(null);
                  }}
                  placeholder={t('auth.field.fullNamePlaceholder')}
                  focused={focusedField === 'name'}
                  hasError={error != null}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  testID="name-input"
                />

                <FormField
                  label={t('auth.field.emailLabel')}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (error) setError(null);
                  }}
                  placeholder={t('auth.field.emailPlaceholder')}
                  focused={focusedField === 'email'}
                  hasError={error != null}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  testID="email-input"
                />

                <FormField
                  label={t('auth.field.passwordLabel')}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) setError(null);
                  }}
                  placeholder={t('auth.signUp.passwordPlaceholder')}
                  focused={focusedField === 'password'}
                  hasError={error != null}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  secureTextEntry
                  returnKeyType="next"
                  testID="password-input"
                />

                <FormField
                  label={t('auth.field.confirmPasswordLabel')}
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    if (error) setError(null);
                  }}
                  placeholder={t('auth.field.confirmPasswordPlaceholder')}
                  focused={focusedField === 'confirmPassword'}
                  hasError={error != null}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  secureTextEntry
                  returnKeyType="go"
                  onSubmitEditing={handleSignUp}
                  testID="confirm-password-input"
                />
              </View>

              {error ? (
                <View
                  style={{
                    marginTop: spacing.lg,
                    borderRadius: radius.lg,
                    backgroundColor: colors.danger.muted,
                    borderWidth: 1,
                    borderColor: colors.danger.border,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                  }}
                  testID="error-view"
                >
                  <Text style={{ ...typography.bodySmall, color: colors.danger.base, textAlign: 'center' }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <View style={{ marginTop: spacing.xl }}>
                <PrimaryButton
                  label={t('auth.signUp.submit')}
                  onPress={handleSignUp}
                  loading={signUpMutation.isPending}
                  icon={ForwardArrow}
                  testID="sign-up-button"
                />
              </View>
              <Text style={{ ...typography.caption, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.lg }}>
                {t('auth.signUp.legalAgree')}{' '}
                <Text onPress={() => router.push('/terms')} style={{ color: colors.text.primary, textDecorationLine: 'underline' }}>{t('auth.signUp.termsLink')}</Text>
                {' '}{t('auth.signUp.legalAnd')}{' '}
                <Text onPress={() => router.push('/privacy')} style={{ color: colors.text.primary, textDecorationLine: 'underline' }}>{t('legal.privacyTitle')}</Text>.
              </Text>
            </GlassPanel>

            <View style={{ marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>
                {t('auth.signUp.alreadyHaveAccount')}
              </Text>
              <Pressable onPress={() => router.replace('/sign-in')} testID="sign-in-link">
                <Text style={{ ...typography.h4, color: colors.brand.primaryLight }}>
                  {t('auth.signUp.signInInstead')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}
