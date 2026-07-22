import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { ReduceMotion, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts, typography } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SWEEP_MS = 900;

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  testID?: string;
}

export function ProgressRing({
  value,
  size = 72,
  strokeWidth = 7,
  color = colors.success.base,
  label,
  testID,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const progress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: SWEEP_MS, reduceMotion: ReduceMotion.System });
  }, [clamped, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value / 100),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} testID={testID}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border.subtle}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: fonts.bold,
            fontWeight: '700',
            fontSize: Math.round(size * 0.24),
            color: colors.text.primary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {Math.round(clamped)}%
        </Text>
        {label ? <Text style={{ ...typography.caption, color: colors.text.tertiary }}>{label}</Text> : null}
      </View>
    </View>
  );
}
