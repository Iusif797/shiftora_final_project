import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { Home, Calendar, Users, BarChart3, UserCircle } from 'lucide-react-native';
import { useSession } from '@/lib/auth/use-session';
import { colors, radius, typography } from '@/theme';
import type { AppUser } from '@/types/app';
import type { LucideIcon } from 'lucide-react-native';

function TabIcon({
  icon: Icon,
  color,
  focused,
  label,
}: {
  icon: LucideIcon;
  color: string;
  focused: boolean;
  label: string;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 58 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? 'rgba(255,255,255,0.1)' : 'transparent',
        }}
      >
        <Icon color={focused ? colors.text.primary : color} size={20} strokeWidth={focused ? 2.5 : 2} />
      </View>
      <Text style={{ ...typography.caption, fontSize: 10, color: focused ? colors.text.primary : colors.text.tertiary }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { data: session } = useSession();
  const role = (session?.user as AppUser | undefined)?.role ?? 'employee';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.bg.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
          height: 80,
          paddingTop: 6,
          paddingBottom: 24,
        },
        tabBarActiveTintColor: colors.text.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Home} color={color} focused={focused} label="Dashboard" />,
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Calendar} color={color} focused={focused} label="Schedule" />,
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Team',
          href: role === 'manager' || role === 'owner' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Users} color={color} focused={focused} label="Team" />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          href: role === 'owner' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <TabIcon icon={BarChart3} color={color} focused={focused} label="Analytics" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={UserCircle} color={color} focused={focused} label="Profile" />,
        }}
      />
    </Tabs>
  );
}
