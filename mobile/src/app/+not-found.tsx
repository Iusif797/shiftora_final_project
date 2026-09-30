import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useT } from '@/i18n/I18nProvider';
import { colors, typography, spacing } from '@/theme';

export default function NotFoundScreen() {
  const t = useT();
  return (
    <>
      <Stack.Screen options={{ title: t('auth.notFound.title') }} />
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
          {t('auth.notFound.message')}
        </Text>

        <Link href={"/(app)" as never} testID="go-home-link" style={{ marginTop: spacing.lg, paddingVertical: spacing.lg }}>
          <Text style={{ ...typography.body, color: colors.brand.gold }}>{t('auth.notFound.goHome')}</Text>
        </Link>
      </View>
    </>
  );
}
