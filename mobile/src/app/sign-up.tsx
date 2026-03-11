import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowRight, UserPlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground, GlassPanel } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormField } from '@/components/form-field';
import { authClient } from '@/lib/auth/auth-client';
import { resolvePostAuthPath } from '@/lib/auth/post-auth';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { colors, radius, spacing, typography } from '@/theme';

type FocusedField = 'name' | 'email' | 'password' | 'confirmPassword' | null;

export default function SignUp() {
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
    const nextPath = await resolvePostAuthPath();

    await invalidateSession();

    if (!nextPath) {
      setError('Unable to start your session. Try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(nextPath);
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
        setError(result.error.message || 'Unable to create account');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      await finishAuth();
    },
    onError: () => {
      setError('Network error. Check your connection and try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleSignUp = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Enter your full name');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!trimmedEmail) {
      setError('Enter your email to continue');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError('Enter a valid email address');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signUpMutation.mutate();
  };

  return (
    <AppBackground>
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
          <SecondaryButton label="Back to sign in" onPress={() => router.replace('/sign-in')} testID="back-button" />

          <View style={{ flex: 1, justifyContent: 'center', paddingTop: spacing.xxxl }}>
            <AccentBadge label="Create workspace access" color={colors.brand.gold} tint={colors.warning.muted} />

            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.xl }}>
              Create your account
            </Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.md }}>
              Sign up once, then choose whether you own a restaurant or are joining a team.
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
                  label="Full name"
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    if (error) setError(null);
                  }}
                  placeholder="Yusif Mamedov"
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
                  label="Email"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (error) setError(null);
                  }}
                  placeholder="you@restaurant.com"
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
                  label="Password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) setError(null);
                  }}
                  placeholder="Create a strong password"
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
                  label="Confirm password"
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    if (error) setError(null);
                  }}
                  placeholder="Repeat your password"
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
                  label="Create account"
                  onPress={handleSignUp}
                  loading={signUpMutation.isPending}
                  icon={ArrowRight}
                  testID="sign-up-button"
                />
              </View>
            </GlassPanel>

            <View style={{ marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>
                Already have an account?
              </Text>
              <Pressable onPress={() => router.replace('/sign-in')} testID="sign-in-link">
                <Text style={{ ...typography.h4, color: colors.brand.primaryLight }}>
                  Sign in instead
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}
