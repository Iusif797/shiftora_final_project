import { useCallback } from 'react';
import { Pressable, View, Text, Platform, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  useSharedValue,
  withSequence,
} from 'react-native-reanimated';
import { Home, Calendar, Users, BarChart3, UserCircle } from 'lucide-react-native';
import { useSession } from '@/lib/auth/use-session';
import { colors, radius } from '@/theme';
import type { AppUser } from '@/types/app';
import type { LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_ITEMS: { name: string; icon: LucideIcon; label: string; roles?: string[] }[] = [
  { name: 'index', icon: Home, label: 'Home' },
  { name: 'shifts', icon: Calendar, label: 'Schedule' },
  { name: 'employees', icon: Users, label: 'Team', roles: ['manager', 'owner'] },
  { name: 'analytics', icon: BarChart3, label: 'Analytics', roles: ['owner'] },
  { name: 'profile', icon: UserCircle, label: 'Profile' },
];

function TabButton({
  icon: Icon,
  label,
  focused,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedIconContainer = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      focused ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
      { duration: 250 }
    ),
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 200 }) }],
  }));

  const animatedLabel = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0.5, { duration: 200 }),
    transform: [
      {
        translateY: withSpring(focused ? 0 : 2, { damping: 15, stiffness: 200 }),
      },
    ],
  }));

  const animatedDot = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 200 }),
    transform: [{ scale: withSpring(focused ? 1 : 0, { damping: 12, stiffness: 180 }) }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.85, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      style={styles.tabButton}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.iconContainer, animatedIconContainer]}>
        <Icon
          color={focused ? '#FFFFFF' : colors.text.tertiary}
          size={21}
          strokeWidth={focused ? 2.4 : 1.8}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: focused ? '#FFFFFF' : colors.text.tertiary },
          animatedLabel,
        ]}
      >
        {label}
      </Animated.Text>
      <Animated.View style={[styles.activeDot, animatedDot]} />
    </AnimatedPressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { data: session } = useSession();
  const role = (session?.user as AppUser | undefined)?.role ?? 'employee';

  const visibleTabs = TAB_ITEMS.filter(
    (tab) => !tab.roles || tab.roles.includes(role)
  );

  return (
    <View style={styles.tabBarOuter}>
      <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
        <View style={styles.tabBarInner}>
          {state.routes.map((route, index) => {
            const tab = visibleTabs.find((t) => t.name === route.name);
            if (!tab) return null;

            const focused = state.index === index;

            return (
              <TabButton
                key={route.key}
                icon={tab.icon}
                label={tab.label}
                focused={focused}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  const { data: session } = useSession();
  const role = (session?.user as AppUser | undefined)?.role ?? 'employee';

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="shifts" options={{ title: 'Schedule' }} />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Team',
          href: role === 'manager' || role === 'owner' ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          href: role === 'owner' ? undefined : null,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: Platform.OS === 'ios' ? 28 : 16,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  blurContainer: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(10, 10, 10, 0.75)',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  iconContainer: {
    width: 40,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
});
