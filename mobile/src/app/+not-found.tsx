import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { colors, typography, spacing } from '@/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View
        testID="not-found-screen"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg.base,
          padding: spacing.xl,
        }}
      >
        <Text style={{ ...typography.h2, color: colors.text.primary }}>
          This screen doesn't exist.
        </Text>

        <Link href={"/(app)" as never} testID="go-home-link" style={{ marginTop: spacing.lg, paddingVertical: spacing.lg }}>
          <Text style={{ ...typography.body, color: colors.brand.gold }}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
