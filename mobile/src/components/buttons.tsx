import type { ComponentType } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadows, spacing, typography } from '@/theme';

type IconComponent = ComponentType<{ color: string; size: number; strokeWidth: number }>;

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconComponent;
  testID?: string;
}

interface BadgeProps {
  label: string;
  color: string;
  tint: string;
}

export function PrimaryButton({ label, onPress, loading = false, disabled = false, icon: Icon, testID }: ButtonProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} testID={testID}>
      {({ pressed }) => (
        <LinearGradient
          colors={pressed ? ['#735CFF', '#5842D6'] : colors.brand.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            minHeight: 50,
            borderRadius: radius.xl,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            opacity: disabled ? 0.48 : 1,
            ...shadows.soft,
          }}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : null}
          {!loading && Icon ? <Icon color="#FFFFFF" size={18} strokeWidth={2.5} /> : null}
          <Text style={{ ...typography.h4, color: '#FFFFFF', fontWeight: '700' }}>{label}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled = false, icon: Icon, testID }: ButtonProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} testID={testID}>
      {({ pressed }) => (
        <View
          style={{
            minHeight: 48,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: pressed ? colors.border.strong : colors.border.default,
            backgroundColor: pressed ? colors.bg.elevated : colors.bg.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            opacity: disabled ? 0.48 : 1,
          }}
        >
          {Icon ? <Icon color={colors.text.secondary} size={18} strokeWidth={2.2} /> : null}
          <Text style={{ ...typography.h4, color: colors.text.secondary }}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function AccentBadge({ label, color, tint }: BadgeProps) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        backgroundColor: tint,
        borderWidth: 1,
        borderColor: `${color}44`,
      }}
    >
      <Text style={{ ...typography.label, color }}>{label}</Text>
    </View>
  );
}

export function GlassDivider() {
  return (
    <LinearGradient
      colors={gradients.glass}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ height: 1, opacity: 0.6 }}
    />
  );
}
