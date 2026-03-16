import * as Sentry from '@sentry/react-native';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { PrimaryButton } from '@/components/buttons';
import { colors, spacing, typography } from '@/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
    router.replace('/welcome');
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg.base,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: spacing.xl,
          }}
          testID="error-boundary-fallback"
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.danger.muted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <AlertTriangle color={colors.danger.base} size={36} strokeWidth={2} />
          </View>
          <Text style={{ ...typography.h3, color: colors.text.primary, textAlign: 'center' }}>
            Что-то пошло не так
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
            {this.state.error.message}
          </Text>
          <PrimaryButton label="Перезапустить" onPress={this.handleRestart} testID="error-restart-button" />
        </View>
      );
    }

    return this.props.children;
  }
}
