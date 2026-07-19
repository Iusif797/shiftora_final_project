import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { AuthBackground, GlassPanel } from '@/components/app-shell';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormField } from '@/components/form-field';
import { authClient } from '@/lib/auth/auth-client';
import { colors, spacing, typography } from '@/theme';

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string; error?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(
    params.error ? 'This reset link is invalid or expired.' : null,
  );

  const mutation = useMutation({
    mutationFn: () => authClient.resetPassword({ newPassword: password, token }),
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error.message || 'This reset link is invalid or expired.');
        return;
      }
      router.replace('/sign-in');
    },
    onError: () => setError('Could not reset your password. Try again.'),
  });

  const submit = () => {
    if (!token) return setError('This reset link is invalid or expired.');
    if (password.length < 10) return setError('Password must be at least 10 characters.');
    if (password.length > 128) return setError('Password must be 128 characters or fewer.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setError(null);
    mutation.mutate();
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xxl, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <GlassPanel>
            <KeyRound color={colors.brand.gold} size={30} />
            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.lg }}>Choose a new password</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xl }}>
              Use at least 10 characters and avoid passwords you use elsewhere.
            </Text>
            <View style={{ gap: spacing.lg }}>
              <FormField label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" testID="reset-password-input" />
              <FormField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" testID="reset-confirm-input" />
              {error ? <Text style={{ ...typography.bodySmall, color: colors.danger.base }}>{error}</Text> : null}
              <PrimaryButton label="Update password" onPress={submit} loading={mutation.isPending} testID="reset-submit" />
              <SecondaryButton label="Request a new link" onPress={() => router.replace('/forgot-password')} />
            </View>
          </GlassPanel>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}
