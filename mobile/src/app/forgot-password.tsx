import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Mail } from 'lucide-react-native';
import { AuthBackground, GlassPanel } from '@/components/app-shell';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormField } from '@/components/form-field';
import { authClient } from '@/lib/auth/auth-client';
import { colors, spacing, typography } from '@/theme';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: Linking.createURL('/reset-password'),
      }),
    onSuccess: () => {
      setError(null);
      setSubmitted(true);
    },
    onError: () => setError('Could not send the reset email. Check your connection and try again.'),
  });

  const submit = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xxl, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <GlassPanel>
            <Mail color={colors.brand.gold} size={30} />
            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.lg }}>Reset password</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xl }}>
              {submitted
                ? 'If an account exists for that email, a 60-minute reset link is on its way.'
                : 'Enter your account email and we’ll send a secure reset link.'}
            </Text>
            {!submitted ? (
              <View style={{ gap: spacing.lg }}>
                <FormField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@restaurant.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  hasError={Boolean(error)}
                  testID="forgot-email-input"
                />
                {error ? <Text style={{ ...typography.bodySmall, color: colors.danger.base }}>{error}</Text> : null}
                <PrimaryButton label="Send reset link" onPress={submit} loading={mutation.isPending} testID="forgot-submit" />
              </View>
            ) : null}
            <View style={{ marginTop: spacing.md }}>
              <SecondaryButton label="Back to sign in" onPress={() => router.replace('/sign-in')} />
            </View>
          </GlassPanel>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}
