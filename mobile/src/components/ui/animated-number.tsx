import { useEffect } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { TextInput } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const COUNT_UP_MS = 600;

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function AnimatedNumber({ value, prefix = '', suffix = '', textStyle, testID }: AnimatedNumberProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(value, {
      duration: COUNT_UP_MS,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [progress, value]);

  const animatedProps = useAnimatedProps(() => {
    const text = `${prefix}${Math.round(progress.value)}${suffix}`;
    return { text, defaultValue: text };
  });

  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      animatedProps={animatedProps}
      style={[{ padding: 0 }, textStyle]}
      testID={testID}
    />
  );
}
