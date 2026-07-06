import type { ComponentType } from 'react';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, gradients, radius, shadows, spacing, typography } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.6 } as const;
const PRESS_SCALE = 0.97;

type IconComponent = ComponentType<{ color: string; size: number; strokeWidth: number }>;

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconComponent;
  testID?: string;
  accessibilityLabel?: string;
}

interface BadgeProps {
  label: string;
  color: string;
  tint: string;
}

function usePressFeedback(active: boolean) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = useCallback(() => {
    if (!active) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
  }, [active, scale]);
  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
  }, [scale]);
  return { style, onPressIn, onPressOut };
}

export function PrimaryButton({ label, onPress, loading = false, disabled = false, icon: Icon, testID, accessibilityLabel }: ButtonProps) {
  const isInactive = disabled || loading;
  const press = usePressFeedback(!isInactive);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={isInactive}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={press.style}
    >
      <LinearGradient
        colors={['#FFFFFF', '#E4E4E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          minHeight: 52,
          borderRadius: radius.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.4 : 1,
          ...shadows.soft,
        }}
      >
        {loading ? <ActivityIndicator color={colors.text.inverse} /> : null}
        {!loading && Icon ? <Icon color={colors.text.inverse} size={18} strokeWidth={2.5} /> : null}
        <Text style={{ ...typography.h4, color: colors.text.inverse, fontWeight: '700' }}>{label}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

export function SecondaryButton({ label, onPress, disabled = false, icon: Icon, testID, accessibilityLabel }: ButtonProps) {
  const press = usePressFeedback(!disabled);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={[
        {
          minHeight: 52,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border.default,
          backgroundColor: colors.bg.surface,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.4 : 1,
        },
        press.style,
      ]}
    >
      {Icon ? <Icon color={colors.text.secondary} size={18} strokeWidth={2.2} /> : null}
      <Text style={{ ...typography.h4, color: colors.text.secondary }}>{label}</Text>
    </AnimatedPressable>
  );
}

export function AccentBadge({ label, color, tint }: BadgeProps) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="text"
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        backgroundColor: tint,
        borderWidth: 1,
        borderColor: `${color}44`,
      }}
    >
      <Text style={{ ...typography.label, color }}>{label}</Text>
    </View>
  );
}

export function GlassDivider() {
  return (
    <LinearGradient
      colors={gradients.glass}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ height: 1, opacity: 0.6 }}
    />
  );
}
