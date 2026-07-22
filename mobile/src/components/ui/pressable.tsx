import type { ReactNode } from 'react';
import { useCallback } from 'react';
import type { AccessibilityRole, Insets, StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motion } from '@/theme';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_SPRING = { ...motion.spring.press, reduceMotion: ReduceMotion.System } as const;

type HapticStrength = 'light' | 'medium' | 'none';

interface PressFeedbackOptions {
  scale?: number;
  haptic?: HapticStrength;
}

export function usePressFeedback(active = true, options: PressFeedbackOptions = {}) {
  const { scale = 0.97, haptic = 'light' } = options;
  const pressed = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pressed.value }] }));
  const onPressIn = useCallback(() => {
    if (!active) return;
    if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pressed.value = withSpring(scale, PRESS_SPRING);
  }, [active, haptic, pressed, scale]);
  const onPressOut = useCallback(() => {
    pressed.value = withSpring(1, PRESS_SPRING);
  }, [pressed]);
  return { style, onPressIn, onPressOut };
}

interface ScalePressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  scale?: number;
  haptic?: HapticStrength;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  hitSlop?: Insets | number;
}

export function ScalePressable({
  onPress,
  onLongPress,
  disabled = false,
  scale,
  haptic,
  style,
  children,
  testID,
  accessibilityLabel,
  accessibilityRole = 'button',
  hitSlop,
}: ScalePressableProps) {
  const press = usePressFeedback(!disabled, { scale, haptic });

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={hitSlop}
      style={[press.style, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
