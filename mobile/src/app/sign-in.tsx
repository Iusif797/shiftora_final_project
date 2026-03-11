import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowRight, LogIn } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBackground, GlassPanel } from '@/components/app-shell';
import { AccentBadge, PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormField } from '@/components/form-field';
import { authClient } from '@/lib/auth/auth-client';
import { resolvePostAuthPath } from '@/lib/auth/post-auth';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { colors, radius, spacing, typography } from '@/theme';

type FocusedField = 'email' | 'password' | null;

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const invalidateSession = useInvalidateSession();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
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

  const signInMutation = useMutation({
    mutationFn: async () =>
      authClient.signIn.email({
        email: email.trim(),
        password,
        rememberMe: true,
      }),
    onSuccess: async (result) => {
      if (result.error) {
        setError(result.error.message || 'Invalid email or password');
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

  const handleSignIn = () => {
    const trimmedEmail = email.trim();

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

    if (!password) {
      setError('Enter your password');
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
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.xxxl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          testID="sign-in-screen"
        >
          <SecondaryButton label="Back" onPress={() => router.replace('/welcome')} testID="back-button" />

          <View style={{ flex: 1, justifyContent: 'center', paddingTop: spacing.xxxl }}>
            <AccentBadge label="Welcome back" color={colors.brand.gold} tint={colors.warning.muted} />

            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.xl }}>
              Sign in to Shiftora
            </Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.md }}>
              Use your email and password to enter your workspace.
            </Text>

            <GlassPanel>
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

              <View style={{ gap: spacing.lg }}>
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
                  placeholder="Enter your password"
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
                  label="Continue"
                  onPress={handleSignIn}
                  loading={signInMutation.isPending}
                  icon={ArrowRight}
                  testID="sign-in-button"
                />
              </View>
            </GlassPanel>

            <View style={{ marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>
                New to Shiftora?
              </Text>
              <Pressable onPress={() => router.push('/sign-up')} testID="sign-up-link">
                <Text style={{ ...typography.h4, color: colors.brand.primaryLight }}>
                  Create account
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}
