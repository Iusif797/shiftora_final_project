import { Drawer } from 'expo-router/drawer';
import { View, Text, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { User, Building2, LogOut, X } from 'lucide-react-native';
import { useSession, useInvalidateSession } from '@/lib/auth/use-session';
import { authClient } from '@/lib/auth/auth-client';
import { getInitials } from '@/lib/formatters';
import { colors } from '@/theme';
import type { AppUser } from '@/types/app';
import { router } from 'expo-router';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.8);
const ICON_SIZE = 20;
const ICON_STROKE = 1.8;
const AVATAR_SIZE = 48;
const ITEM_HEIGHT = 52;

const navItems = [
  { key: 'profile', label: 'Profile', icon: User, route: '/(app)/(tabs)/profile' as const },
  { key: 'settings', label: 'Restaurant settings', icon: Building2, route: '/(app)/settings' as const },
] as const;

function NavItem({ icon: Icon, label, onPress }: { icon: typeof User; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        height: ITEM_HEIGHT,
        gap: 16,
        paddingHorizontal: 24,
        backgroundColor: pressed ? 'rgba(255,255,255,0.04)' : 'transparent',
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <Icon color="rgba(255,255,255,0.55)" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.85)', letterSpacing: -0.1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function DrawerContent({ navigation }: DrawerContentComponentProps) {
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const user = session?.user as AppUser | undefined;
  const [signingOut, setSignOut] = useState(false);

  const handleLogout = async () => {
    setSignOut(true);
    await authClient.signOut();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await invalidateSession();
  };

  const closeDrawer = () => navigation.dispatch(DrawerActions.closeDrawer());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080808' }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 8 }}>
        <Pressable
          onPress={closeDrawer}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
          })}
        >
          <X color="rgba(255,255,255,0.45)" size={16} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {user?.image ? (
            <Image
              source={{ uri: user.image }}
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: AVATAR_SIZE / 2,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: AVATAR_SIZE / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              {user?.name ? (
                <Text style={{ fontSize: 17, fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
                  {getInitials(user.name)}
                </Text>
              ) : (
                <User color="rgba(255,255,255,0.35)" size={22} strokeWidth={1.8} />
              )}
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.2 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user?.name || 'Shiftora'}
            </Text>
            <Text
              style={{ fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {user?.email || 'Workspace'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 24 }} />

      <View style={{ flex: 1, paddingTop: 8 }}>
        {navItems.map((item) => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            onPress={() => {
              closeDrawer();
              if (item.route) router.push(item.route);
            }}
          />
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 24 }} />
      <View style={{ paddingVertical: 8 }}>
        <Pressable
          onPress={handleLogout}
          disabled={signingOut}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            height: ITEM_HEIGHT,
            gap: 16,
            paddingHorizontal: 24,
            backgroundColor: pressed ? 'rgba(235,87,87,0.06)' : 'transparent',
          })}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(235,87,87,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(235,87,87,0.12)',
            }}
          >
            {signingOut ? (
              <ActivityIndicator color={colors.danger.base} size="small" />
            ) : (
              <LogOut color={colors.danger.base} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            )}
          </View>
          <Text style={{ fontSize: 15, fontWeight: '500', color: colors.danger.base, letterSpacing: -0.1 }}>
            Log out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function AppLayout() {
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(0,0,0,0.7)',
        sceneStyle: { backgroundColor: colors.bg.base },
        drawerStyle: {
          width: DRAWER_WIDTH,
          backgroundColor: '#080808',
          borderRightWidth: 1,
          borderRightColor: 'rgba(255,255,255,0.04)',
        },
      }}
    >
      <Drawer.Screen name="(tabs)" />
      <Drawer.Screen name="settings" />
      <Drawer.Screen name="alerts" />
      <Drawer.Screen name="attendance" />
    </Drawer>
  );
}
