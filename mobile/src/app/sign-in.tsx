import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowRight, ChevronLeft, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, shadows } from '@/theme';
import { authClient } from '@/lib/auth/auth-client';

const { width, height } = Dimensions.get('window');
const signinBg = require('../../assets/auth/signin-background.png');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);
  const btnScale = useSharedValue(1);

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleSendOTP = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email to continue');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError('Enter a valid email address');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: trimmed,
        type: 'sign-in',
      });

      setLoading(false);

      if (result.error) {
        setError(result.error.message || 'Something went wrong');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    } catch {
      setLoading(false);
      setError('Network error. Check your connection and try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({ pathname: '/verify-otp', params: { email: trimmed } });
  };

  const inputBorderColor = error
    ? colors.danger.base
    : focused
      ? 'rgba(255,255,255,0.28)'
      : 'rgba(255,255,255,0.08)';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Image
        source={signinBg}
        style={{ width, height, position: 'absolute' }}
        contentFit="cover"
        blurRadius={24}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.82)', 'rgba(0,0,0,0.96)']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', width, height }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 24,
          }}
        >
          <Animated.View entering={FadeInUp.delay(100).duration(500)}>
            <Pressable
              onPress={() => router.replace('/welcome')}
              hitSlop={12}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                paddingVertical: 8,
              }}
              testID="back-button"
            >
              <ChevronLeft color="rgba(255,255,255,0.7)" size={22} strokeWidth={2.2} />
              <Animated.Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: 'rgba(255,255,255,0.7)',
                  marginLeft: 2,
                }}
              >
                Back
              </Animated.Text>
            </Pressable>
          </Animated.View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Animated.View
              entering={FadeInDown.delay(200).duration(600).springify()}
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                ...shadows.card,
              }}
            >
              <BlurView intensity={40} tint="dark" style={{ padding: 24 }}>
                <Animated.Text
                  entering={FadeInDown.delay(350).duration(500)}
                  style={{
                    fontSize: 24,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    letterSpacing: -0.5,
                  }}
                >
                  Sign in to Shiftora
                </Animated.Text>

                <Animated.Text
                  entering={FadeInDown.delay(450).duration(500)}
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: 'rgba(255,255,255,0.5)',
                    textAlign: 'center',
                    lineHeight: 20,
                    marginTop: 8,
                    paddingHorizontal: 16,
                  }}
                >
                  Enter your work email to receive a secure login code
                </Animated.Text>

                <Animated.View entering={FadeInDown.delay(550).duration(500)} style={{ marginTop: 32 }}>
                  <Pressable
                    onPress={() => inputRef.current?.focus()}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: inputBorderColor,
                      paddingHorizontal: 16,
                      minHeight: 54,
                      gap: 12,
                    }}
                  >
                    <Mail
                      color={focused ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
                      size={18}
                      strokeWidth={2}
                    />
                    <TextInput
                      ref={inputRef}
                      value={email}
                      onChangeText={(v) => {
                        setEmail(v);
                        if (error) setError(null);
                      }}
                      placeholder="your@email.com"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      returnKeyType="go"
                      onSubmitEditing={handleSendOTP}
                      testID="email-input"
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontWeight: '400',
                        color: '#FFFFFF',
                        paddingVertical: 0,
                      }}
                    />
                  </Pressable>

                  {error ? (
                    <Animated.Text
                      entering={FadeInDown.duration(300)}
                      style={{
                        fontSize: 13,
                        color: colors.danger.base,
                        marginTop: 8,
                        marginLeft: 4,
                      }}
                    >
                      {error}
                    </Animated.Text>
                  ) : null}
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(650).duration(500)} style={{ marginTop: 24 }}>
                  <AnimatedPressable
                    onPress={handleSendOTP}
                    disabled={loading}
                    onPressIn={() => {
                      btnScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
                    }}
                    onPressOut={() => {
                      btnScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                    }}
                    style={btnAnimStyle}
                    testID="send-otp-button"
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.06)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        minHeight: 54,
                        borderRadius: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Animated.Text
                            style={{
                              fontSize: 16,
                              fontWeight: '600',
                              color: '#FFFFFF',
                              letterSpacing: -0.1,
                            }}
                          >
                            Continue
                          </Animated.Text>
                          <ArrowRight color="#FFFFFF" size={18} strokeWidth={2.2} />
                        </>
                      )}
                    </LinearGradient>
                  </AnimatedPressable>
                </Animated.View>
              </BlurView>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
