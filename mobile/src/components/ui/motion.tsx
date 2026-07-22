import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, ReduceMotion, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { motion } from '@/theme';

function staggerDelay(index: number) {
  return Math.min(index, motion.stagger.max) * motion.stagger.step;
}

export function useMotionSafe() {
  return !useReducedMotion();
}

export function enterFade(index = 0) {
  return FadeInDown.delay(staggerDelay(index))
    .springify()
    .damping(motion.spring.entrance.damping)
    .stiffness(motion.spring.entrance.stiffness)
    .reduceMotion(ReduceMotion.System);
}

export function enterZoom(index = 0) {
  return ZoomIn.delay(staggerDelay(index))
    .springify()
    .damping(motion.spring.entrance.damping)
    .stiffness(motion.spring.entrance.stiffness)
    .reduceMotion(ReduceMotion.System);
}

export function exitFade() {
  return FadeOutUp.duration(Math.round(motion.duration.base * motion.duration.exitFactor)).reduceMotion(
    ReduceMotion.System,
  );
}

interface StaggerItemProps {
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function StaggerItem({ index, children, style }: StaggerItemProps) {
  return (
    <Animated.View entering={enterFade(index)} style={style}>
      {children}
    </Animated.View>
  );
}
