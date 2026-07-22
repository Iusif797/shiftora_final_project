import type { ComponentType, ReactNode } from 'react';
import type { TextStyle } from 'react-native';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { enterFade, enterZoom } from '@/components/ui/motion';
import { ScalePressable } from '@/components/ui/pressable';
import { colors, fonts, radius, shadows, spacing, typography } from '@/theme';

type IconComponent = ComponentType<{ color: string; size: number; strokeWidth: number }>;

const metricValueStyle: TextStyle = {
  fontFamily: fonts.extrabold,
  fontSize: 28,
  fontWeight: '800',
  letterSpacing: -0.8,
  color: colors.text.primary,
  fontVariant: ['tabular-nums'],
};

interface CardProps {
  children: ReactNode;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: IconComponent;
  color: string;
  subtitle?: string;
  onPress?: () => void;
  testID?: string;
}

interface EmptyStateAction {
  label: string;
  onPress: () => void;
  testID?: string;
}

interface EmptyStateProps {
  icon: IconComponent;
  title: string;
  description: string;
  color?: string;
  action?: EmptyStateAction;
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

function MetricCardBody({ label, value, icon: Icon, color, subtitle }: Omit<MetricCardProps, 'onPress' | 'testID'>) {
  return (
    <>
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
      {typeof value === 'number' ? (
        <AnimatedNumber value={value} textStyle={metricValueStyle} />
      ) : (
        <Text style={metricValueStyle}>{value}</Text>
      )}
      <Text style={{ ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 }}>{label}</Text>
      {subtitle ? (
        <Text style={{ ...typography.caption, color, marginTop: spacing.xs }}>{subtitle}</Text>
      ) : null}
    </>
  );
}

export function MetricCard({ label, value, icon, color, subtitle, onPress, testID }: MetricCardProps) {
  const cardStyle = {
    flex: 1,
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
  } as const;

  if (onPress) {
    return (
      <ScalePressable onPress={onPress} testID={testID} style={cardStyle}>
        <MetricCardBody label={label} value={value} icon={icon} color={color} subtitle={subtitle} />
      </ScalePressable>
    );
  }

  return (
    <View style={cardStyle} testID={testID}>
      <MetricCardBody label={label} value={value} icon={icon} color={color} subtitle={subtitle} />
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  testID?: string;
}

export function ErrorState({ message, onRetry, testID }: ErrorStateProps) {
  return (
    <SurfaceCard>
      <View style={{ alignItems: 'center', gap: spacing.lg }} testID={testID}>
        <Text style={{ ...typography.body, color: colors.danger.base, textAlign: 'center' }}>{message}</Text>
        <PrimaryButton label="Retry" onPress={onRetry} testID="error-retry-button" />
      </View>
    </SurfaceCard>
  );
}

export function EmptyState({ icon: Icon, title, description, color = colors.brand.primary, action, testID }: EmptyStateProps) {
  return (
    <SurfaceCard>
      <View style={{ alignItems: 'center' }} testID={testID}>
        <Animated.View
          entering={enterZoom()}
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
        </Animated.View>
        <Animated.View entering={enterFade(1)} style={{ alignItems: 'center' }}>
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
        </Animated.View>
        {action ? (
          <Animated.View entering={enterFade(2)} style={{ alignSelf: 'stretch', marginTop: spacing.lg }}>
            <SecondaryButton label={action.label} onPress={action.onPress} testID={action.testID} />
          </Animated.View>
        ) : null}
      </View>
    </SurfaceCard>
  );
}
