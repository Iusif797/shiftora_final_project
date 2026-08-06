import { Text, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { PrimaryButton } from '@/components/buttons';
import { colors, spacing, typography } from '@/theme';

interface ConnectionErrorScreenProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export function ConnectionErrorScreen({ onRetry, isRetrying }: ConnectionErrorScreenProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg.base,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
      }}
      testID="connection-error-screen"
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.warning.muted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <WifiOff color={colors.warning.base} size={36} strokeWidth={2} />
      </View>
      <Text style={{ ...typography.h3, color: colors.text.primary, textAlign: 'center' }}>
        Can&apos;t reach the server
      </Text>
      <Text
        style={{
          ...typography.bodySmall,
          color: colors.text.tertiary,
          textAlign: 'center',
          marginTop: spacing.sm,
          marginBottom: spacing.xl,
        }}
      >
        Check your internet connection and try again. The server may take a moment to wake up.
      </Text>
      <PrimaryButton label="Try again" onPress={onRetry} loading={isRetrying} testID="connection-retry-button" />
    </View>
  );
}
