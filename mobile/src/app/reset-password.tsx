import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { AuthBackground, GlassPanel } from '@/components/app-shell';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormField } from '@/components/form-field';
import { authClient } from '@/lib/auth/auth-client';
import { useT } from '@/i18n/I18nProvider';
import { useKeyboard } from '@/hooks/use-keyboard';
import { colors, spacing, typography } from '@/theme';

export default function ResetPassword() {
  const { isKeyboardVisible, keyboardHeight } = useKeyboard();
  const t = useT();
  const params = useLocalSearchParams<{ token?: string; error?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(
    params.error ? t('auth.error.resetLinkInvalid') : null,
  );

  const mutation = useMutation({
    mutationFn: () => authClient.resetPassword({ newPassword: password, token }),
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error.message || t('auth.error.resetLinkInvalid'));
        return;
      }
      router.replace('/sign-in');
    },
    onError: () => setError(t('auth.error.resetPasswordFailed')),
  });

  const submit = () => {
    if (!token) return setError(t('auth.error.resetLinkInvalid'));
    if (password.length < 10) return setError(t('auth.error.passwordTooShortPeriod'));
    if (password.length > 128) return setError(t('auth.error.passwordTooLong'));
    if (password !== confirmPassword) return setError(t('auth.error.passwordMismatchPeriod'));
    setError(null);
    mutation.mutate();
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xxl, paddingBottom: isKeyboardVisible ? Math.max(keyboardHeight, 260) + spacing.xl : spacing.xxl, justifyContent: isKeyboardVisible ? 'flex-start' : 'center' }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <GlassPanel>
            {!isKeyboardVisible && <KeyRound color={colors.brand.gold} size={30} />}
            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.lg }}>{t('auth.resetPassword.title')}</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xl }}>
              {t('auth.resetPassword.subtitle')}
            </Text>
            <View style={{ gap: spacing.lg }}>
              <FormField label={t('auth.field.newPasswordLabel')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" testID="reset-password-input" />
              <FormField label={t('auth.field.confirmPasswordLabel')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" testID="reset-confirm-input" />
              {error ? <Text style={{ ...typography.bodySmall, color: colors.danger.base }}>{error}</Text> : null}
              <PrimaryButton label={t('auth.resetPassword.submit')} onPress={submit} loading={mutation.isPending} testID="reset-submit" />
              <SecondaryButton label={t('auth.resetPassword.requestNewLink')} onPress={() => router.replace('/forgot-password')} />
            </View>
          </GlassPanel>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}
