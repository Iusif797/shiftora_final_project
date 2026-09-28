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
import { useT } from '@/i18n/I18nProvider';
import { useKeyboard } from '@/hooks/use-keyboard';
import { colors, spacing, typography } from '@/theme';

export default function ForgotPassword() {
  const { isKeyboardVisible, keyboardHeight } = useKeyboard();
  const t = useT();
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
    onError: () => setError(t('auth.error.resetEmailFailed')),
  });

  const submit = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('auth.error.emailInvalid'));
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xxl, paddingBottom: isKeyboardVisible ? Math.max(keyboardHeight, 260) + spacing.xl : spacing.xxl, justifyContent: isKeyboardVisible ? 'flex-start' : 'center' }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <GlassPanel>
            {!isKeyboardVisible && <Mail color={colors.brand.gold} size={30} />}
            <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.lg }}>{t('auth.forgotPassword.title')}</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xl }}>
              {submitted
                ? t('auth.forgotPassword.subtitleSuccess')
                : t('auth.forgotPassword.subtitle')}
            </Text>
            {!submitted ? (
              <View style={{ gap: spacing.lg }}>
                <FormField
                  label={t('auth.field.emailLabel')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.field.emailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  hasError={Boolean(error)}
                  testID="forgot-email-input"
                />
                {error ? <Text style={{ ...typography.bodySmall, color: colors.danger.base }}>{error}</Text> : null}
                <PrimaryButton label={t('auth.forgotPassword.submit')} onPress={submit} loading={mutation.isPending} testID="forgot-submit" />
              </View>
            ) : null}
            <View style={{ marginTop: spacing.md }}>
              <SecondaryButton label={t('auth.nav.backToSignIn')} onPress={() => router.replace('/sign-in')} />
            </View>
          </GlassPanel>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}
