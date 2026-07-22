import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react-native';
import { enterFade, exitFade } from '@/components/ui/motion';
import { dismissToast, subscribeToToasts } from '@/lib/toast';
import type { ToastItem } from '@/lib/toast';
import { colors, motion, radius, shadows, spacing, typography } from '@/theme';

const AUTO_DISMISS_MS = 4000;
const SWIPE_DISMISS_THRESHOLD = -24;

const variantAppearance = {
  success: { color: colors.success.base, icon: CheckCircle2 },
  error: { color: colors.danger.base, icon: AlertTriangle },
  info: { color: colors.info.base, icon: Info },
} as const;

interface ToastCardProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastCard({ item, onDismiss }: ToastCardProps) {
  const { color, icon: Icon } = variantAppearance[item.variant];
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (item.variant === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const timer = setTimeout(() => onDismiss(item.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [item.id, item.variant, onDismiss]);

  const swipe = Gesture.Pan()
    .onUpdate((event) => {
      dragY.value = Math.min(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY < SWIPE_DISMISS_THRESHOLD) {
        runOnJS(onDismiss)(item.id);
        return;
      }
      dragY.value = withSpring(0, motion.spring.press);
    });

  const drag = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View entering={enterFade()} exiting={exitFade()} layout={LinearTransition.springify()} style={drag}>
        <Pressable
          onPress={() => onDismiss(item.id)}
          accessibilityRole="alert"
          testID={`toast-${item.variant}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            backgroundColor: colors.bg.elevated,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border.default,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            overflow: 'hidden',
            ...shadows.card,
          }}
        >
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color }} />
          <Icon color={color} size={20} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.h4, color: colors.text.primary }} numberOfLines={2}>
              {item.title}
            </Text>
            {item.message ? (
              <Text style={{ ...typography.bodySmall, color: colors.text.secondary, marginTop: 2 }} numberOfLines={3}>
                {item.message}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToToasts(setItems), []);

  const handleDismiss = useCallback((id: string) => dismissToast(id), []);

  if (items.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      testID="toast-host"
      style={{
        position: 'absolute',
        top: insets.top + spacing.sm,
        left: spacing.md,
        right: spacing.md,
        gap: spacing.sm,
        zIndex: 1000,
      }}
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={handleDismiss} />
      ))}
    </View>
  );
}
