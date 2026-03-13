import type { ReactElement, ReactNode } from 'react';
import type { RefreshControlProps } from 'react-native';
import { ImageBackground, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, gradients, shadows, spacing, typography } from '@/theme';

interface AppBackgroundProps {
  children: ReactNode;
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

interface ScreenScrollProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  testID?: string;
  refreshControl?: ReactElement<RefreshControlProps>;
}

const heroImage = require('../../assets/onboarding/hero.png');

export function AuthBackground({ children }: AppBackgroundProps) {
  return (
    <ImageBackground
      source={heroImage}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }}>
        {children}
      </View>
    </ImageBackground>
  );
}

export function AppBackground({ children }: AppBackgroundProps) {
  return (
    <LinearGradient colors={gradients.page} style={{ flex: 1 }}>
      <View
        style={{
          position: 'absolute',
          top: -70,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: 'rgba(130,102,255,0.08)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: -20,
          top: 180,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: 'rgba(127,197,255,0.05)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 40,
          bottom: -30,
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: 'rgba(231,177,95,0.04)',
        }}
      />
      {children}
    </LinearGradient>
  );
}

export function ScreenHeader({ title, subtitle, leftSlot, rightSlot }: ScreenHeaderProps) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        {leftSlot ? <View>{leftSlot}</View> : null}
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.h1, color: colors.text.primary }}>{title}</Text>
          {subtitle ? (
            <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>{subtitle}</Text>
          ) : null}
        </View>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

export function ScreenScroll({ children, title, subtitle, leftSlot, rightSlot, testID, refreshControl }: ScreenScrollProps) {
  return (
    <AppBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScreenHeader title={title} subtitle={subtitle} leftSlot={leftSlot} rightSlot={rightSlot} />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          testID={testID}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

export function GlassPanel({ children }: AppBackgroundProps) {
  return (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border.default,
        backgroundColor: colors.bg.blur,
        padding: spacing.lg,
        ...shadows.card,
      }}
    >
      {children}
    </LinearGradient>
  );
}
