import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, radius } from '@/theme';

const FILL_MS = 700;

interface MiniProgressProps {
  value: number;
  color: string;
  height?: number;
}

export function MiniProgress({ value, color, height = 4 }: MiniProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: FILL_MS, reduceMotion: ReduceMotion.System });
  }, [clamped, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View style={{ height, borderRadius: radius.full, backgroundColor: colors.bg.elevated, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: radius.full, backgroundColor: color }, fill]} />
    </View>
  );
}
