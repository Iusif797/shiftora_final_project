import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowRight, LogIn } from 'lucide-react-native';
import { directionalIcon } from '@/components/ui/directional-icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBackground, GlassPanel } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { FormField } from '@/components/form-field';
import { authClient } from '@/lib/auth/auth-client';
import { resolvePostAuthPath } from '@/lib/auth/post-auth';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { useI18n, useT } from '@/i18n/I18nProvider';
import { trailingText } from '@/i18n/rtl-styles';
import { useKeyboard } from '@/hooks/use-keyboard';
import { colors, radius, spacing, typography } from '@/theme';

/** "Continue" arrow — a directional affordance, so it flips under RTL. */
const ForwardArrow = directionalIcon(ArrowRight);

type FocusedField = 'email' | 'password' | null;

export default function SignIn() {
  const t = useT();
  const { isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { isKeyboardVisible, keyboardHeight } = useKeyboard();
  const invalidateSession = useInvalidateSession();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
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

  const signInMutation = useMutation({
    mutationFn: async () =>
      authClient.signIn.email({
        email: email.trim(),
        password,
        rememberMe: true,
      }),
    onSuccess: async (result) => {
      if (result.error) {
        setError(result.error.message || t('auth.error.invalidCredentials'));
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

  const handleSignIn = () => {
    const trimmedEmail = email.trim();

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

    if (!password) {
      setError(t('auth.error.passwordRequired'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signInMutation.mutate();
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.xxl,
                paddingTop: insets.top + (isKeyboardVisible ? spacing.xs : spacing.sm),
                paddingBottom: insets.bottom + (isKeyboardVisible ? Math.max(keyboardHeight, 260) + spacing.xl : spacing.xxxl),
          }}
          keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          testID="sign-in-screen"
        >
          {/* Language stays reachable before sign-in — someone who cannot read
              the form is exactly who needs it. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label={t('common.back')} onPress={() => router.replace('/welcome')} testID="back-button" />
            </View>
            <LanguageSwitcher testID="sign-in-language-switcher" />
          </View>

          <View style={{ flex: 1, justifyContent: isKeyboardVisible ? 'flex-start' : 'center', paddingTop: isKeyboardVisible ? spacing.md : spacing.xxxl }}>
            <AccentBadge label={t('auth.signIn.badge')} color={colors.brand.gold} tint={colors.warning.muted} />

            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.xl }}>
              {t('auth.signIn.title')}
            </Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.md }}>
              {t('auth.signIn.subtitle')}
            </Text>

            <GlassPanel>
                  {!isKeyboardVisible && (
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: radius.xxl,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(127,197,255,0.14)',
                  borderWidth: 1,
                  borderColor: colors.info.border,
                  alignSelf: 'center',
                  marginBottom: spacing.xl,
                }}
              >
                <LogIn color={colors.brand.secondary} size={28} strokeWidth={1.9} />
              </View>

                                )}
<View style={{ gap: spacing.lg }}>
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
                  placeholder={t('auth.signIn.passwordPlaceholder')}
                  focused={focusedField === 'password'}
                  hasError={error != null}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  secureTextEntry
                  returnKeyType="go"
                  onSubmitEditing={handleSignIn}
                  testID="password-input"
                />
                <Pressable onPress={() => router.push('/forgot-password')} testID="forgot-password-link" accessibilityRole="link">
                  <Text style={{ ...typography.bodySmall, color: colors.brand.primaryLight, ...trailingText(isRTL) }}>
                    {t('auth.field.forgotPassword')}
                  </Text>
                </Pressable>
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
                  label={t('auth.signIn.submit')}
                  onPress={handleSignIn}
                  loading={signInMutation.isPending}
                  icon={ForwardArrow}
                  testID="sign-in-button"
                />
              </View>
            </GlassPanel>

            <View style={{ marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>
                {t('auth.signIn.newToShiftora')}
              </Text>
              <Pressable onPress={() => router.push('/sign-up')} testID="sign-up-link">
                <Text style={{ ...typography.h4, color: colors.brand.primaryLight }}>
                  {t('auth.signIn.createAccount')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}
