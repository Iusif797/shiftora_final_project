import type { ComponentType, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type IconComponent = ComponentType<{ color: string; size: number; strokeWidth: number }>;

interface CardProps {
  children: ReactNode;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: IconComponent;
  color: string;
  subtitle?: string;
}

interface EmptyStateProps {
  icon: IconComponent;
  title: string;
  description: string;
  color?: string;
  testID?: string;
}

export function SurfaceCard({ children }: CardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.bg.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border.default,
        padding: spacing.lg,
        ...shadows.soft,
      }}
    >
      {children}
    </View>
  );
}

export function HighlightCard({ children }: CardProps) {
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: colors.border.default,
        padding: spacing.lg,
        backgroundColor: colors.bg.blur,
        ...shadows.card,
      }}
    >
      {children}
    </LinearGradient>
  );
}

export function MetricCard({ label, value, icon: Icon, color, subtitle }: MetricCardProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border.default,
        padding: spacing.lg,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: `${color}18`,
          borderWidth: 1,
          borderColor: `${color}36`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
        }}
      >
        <Icon color={color} size={20} strokeWidth={1.8} />
      </View>
      <Text style={{ ...typography.h3, color: colors.text.primary }}>{value}</Text>
      <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>{label}</Text>
      {subtitle ? (
        <Text style={{ ...typography.caption, color, marginTop: spacing.xs }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon: Icon, title, description, color = colors.brand.primary, testID }: EmptyStateProps) {
  return (
    <SurfaceCard>
      <View style={{ alignItems: 'center' }} testID={testID}>
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${color}16`,
            borderWidth: 1,
            borderColor: `${color}34`,
            marginBottom: spacing.lg,
          }}
        >
          <Icon color={color} size={30} strokeWidth={1.7} />
        </View>
        <Text style={{ ...typography.h3, color: colors.text.primary, textAlign: 'center' }}>{title}</Text>
        <Text
          style={{
            ...typography.bodySmall,
            color: colors.text.tertiary,
            textAlign: 'center',
            marginTop: spacing.sm,
          }}
        >
          {description}
        </Text>
      </View>
    </SurfaceCard>
  );
}
