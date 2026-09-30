import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { useI18n } from '@/i18n/I18nProvider';
import { dirProp, headerBackButton, mirrorIcon } from '@/i18n/rtl-styles';
import type { TranslationKey } from '@/i18n/resolver';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Privacy policy and terms of service.
 *
 * The prose itself is deliberately NOT machine-translated: it is legally
 * binding text, and a wrong word in six languages is a liability, not a
 * feature. It stays English and says so, through a single translated notice
 * (`legal.englishOnlyNotice`). The chrome around it — title, "last updated",
 * back button — is translated normally.
 */
export function LegalScreen({
  titleKey,
  updated,
  sections,
}: {
  titleKey: TranslationKey;
  updated: string;
  sections: { title: string; body: string }[];
}) {
  const { t, isRTL } = useI18n();

  return (
    <ScreenScroll
      title={t(titleKey)}
      subtitle={t('legal.lastUpdated', { date: updated })}
      leftSlot={
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace('/');
          }}
          style={headerBackButton}
          hitSlop={24}
          accessibilityLabel={t('a11y.back')}
          testID="legal-back-button"
        >
          <View style={mirrorIcon(isRTL)}>
            <ChevronLeft color={colors.text.primary} size={24} />
          </View>
        </Pressable>
      }
    >
      <View style={{ gap: spacing.xl, paddingBottom: spacing.xxxl }}>
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border.default,
            backgroundColor: colors.bg.card,
          }}
          testID="legal-english-only-notice"
        >
          <Text style={{ ...typography.bodySmall, color: colors.text.tertiary }}>
            {t('legal.englishOnlyNotice')}
          </Text>
        </View>

        {/* The prose is English, so it keeps LTR even when the app is
            mirrored — `dir` for react-native-web, `writingDirection` for iOS. */}
        <View style={{ gap: spacing.xl }} {...dirProp('ltr')}>
          {sections.map((section) => (
            <View key={section.title}>
              <Text
                style={{ ...typography.h3, color: colors.text.primary, writingDirection: 'ltr' }}
              >
                {section.title}
              </Text>
              <Text
                style={{
                  ...typography.body,
                  color: colors.text.secondary,
                  marginTop: spacing.sm,
                  writingDirection: 'ltr',
                }}
              >
                {section.body}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScreenScroll>
  );
}
