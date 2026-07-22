import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius as radiusTokens, spacing } from '@/theme';

const PULSE_MS = 900;
const OPACITY_HIGH = 0.9;
const OPACITY_LOW = 0.45;
const OPACITY_STATIC = 0.6;

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, radius = radiusTokens.sm, style }: SkeletonProps) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(OPACITY_HIGH);

  useEffect(() => {
    if (reduced) {
      opacity.value = OPACITY_STATIC;
      return;
    }
    opacity.value = withRepeat(withTiming(OPACITY_LOW, { duration: PULSE_MS }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reduced]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.bg.elevated }, pulse, style]}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: DimensionValue;
}

export function SkeletonText({ lines = 2, lastLineWidth = '55%' }: SkeletonTextProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} height={12} width={index === lines - 1 ? lastLineWidth : '100%'} />
      ))}
    </View>
  );
}
