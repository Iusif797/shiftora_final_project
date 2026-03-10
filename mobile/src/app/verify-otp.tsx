import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OtpInput } from 'react-native-otp-entry';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { AppBackground, GlassPanel } from '@/components/app-shell';
import { AccentBadge } from '@/components/buttons';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { colors, radius, spacing, typography } from '@/theme';

export default function VerifyOTP() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const invalidateSession = useInvalidateSession();
  const safeEmail = email?.trim() ?? '';

  const handleVerifyOTP = async (otp: string) => {
    setLoading(true);
    setError(null);

    const result = await authClient.signIn.emailOtp({
      email: safeEmail,
      otp,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message || 'Invalid code. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await invalidateSession();
  };

  const handleResend = async () => {
    await authClient.emailOtp.sendVerificationOtp({ email: safeEmail, type: 'sign-in' });
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <AppBackground>
      <View style={{ flex: 1, paddingHorizontal: spacing.xxl, paddingTop: 68, paddingBottom: spacing.xxxxl }}>
        <Pressable
          onPress={() => router.back()}
          testID="back-button"
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.bg.card,
            borderWidth: 1,
            borderColor: colors.border.default,
          }}
        >
          <ArrowLeft color={colors.text.secondary} size={20} strokeWidth={2.2} />
        </Pressable>

        <View style={{ marginTop: spacing.xxxl, marginBottom: spacing.xxxl }}>
          <AccentBadge label="Secure verification" color={colors.brand.gold} tint={colors.warning.muted} />
          <View
            style={{
              width: 78,
              height: 78,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: spacing.xl,
              backgroundColor: 'rgba(127,197,255,0.14)',
              borderWidth: 1,
              borderColor: colors.info.border,
            }}
          >
            <Mail color={colors.brand.secondary} size={30} strokeWidth={1.8} />
          </View>
          <Text style={{ ...typography.h1, color: colors.text.primary, marginTop: spacing.xl }}>Check your email</Text>
          <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.md }}>
            We sent a 6-digit code to{'\n'}
            <Text style={{ color: colors.text.primary }}>{safeEmail}</Text>
          </Text>
        </View>

        <GlassPanel>
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, textAlign: 'center', marginBottom: spacing.xl }}>
            Enter the code below to access your workspace.
          </Text>
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }} testID="loading-indicator">
              <ActivityIndicator color={colors.brand.primary} size="large" />
              <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: spacing.md }}>Verifying your access...</Text>
            </View>
          ) : (
            <OtpInput
              numberOfDigits={6}
              onFilled={handleVerifyOTP}
              type="numeric"
              focusColor={colors.brand.primary}
              theme={{
                containerStyle: { gap: spacing.sm },
                inputsContainerStyle: { gap: spacing.sm },
                pinCodeContainerStyle: {
                  width: 46,
                  height: 60,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  backgroundColor: colors.bg.surface,
                },
                pinCodeTextStyle: {
                  color: colors.text.primary,
                  fontSize: 24,
                  fontWeight: '700',
                },
                focusedPinCodeContainerStyle: {
                  borderColor: colors.brand.primaryLight,
                  backgroundColor: colors.bg.elevated,
                },
              }}
            />
          )}
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
              <Text style={{ ...typography.bodySmall, color: colors.danger.base, textAlign: 'center' }}>{error}</Text>
            </View>
          ) : null}
        </GlassPanel>

        <View style={{ marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>Didn&apos;t get the code?</Text>
          <Pressable onPress={handleResend} testID="resend-button">
            <Text style={{ ...typography.h4, color: colors.brand.primaryLight }}>Resend code</Text>
          </Pressable>
        </View>
      </View>
    </AppBackground>
  );
}
