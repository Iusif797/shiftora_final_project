import { useCallback, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { Check, Globe } from 'lucide-react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { planDirectionChange } from '@/i18n/direction';
import { directionForLocale, type SupportedLocale } from '@/i18n/resolver';
import { dirProp } from '@/i18n/rtl-styles';
import { ScalePressable } from '@/components/ui/pressable';
import { colors, radius, shadows, spacing, typography } from '@/theme';

/**
 * The language control is an ICON, not a word — it has to read the same in a
 * language the person cannot yet read. The active language is still visible:
 * its two-letter code sits in a badge on the globe, and the sheet marks the
 * active row with a check plus a highlight (never colour alone).
 */
export function LanguageSwitcher({ testID = 'language-switcher' }: { testID?: string }) {
  const { locale, locales, t, setLocale, isRTL, applyRestart } = useI18n();
  const [open, setOpen] = useState(false);
  /** Set when the chosen locale needs a native restart to mirror the layout. */
  const [pendingRestart, setPendingRestart] = useState<SupportedLocale | null>(null);
  const [manualRestart, setManualRestart] = useState<SupportedLocale | null>(null);

  const activeName = locales.find((option) => option.code === locale)?.nativeName ?? locale;

  const choose = useCallback(
    async (next: SupportedLocale) => {
      const willRestart =
        Platform.OS !== 'web' &&
        planDirectionChange(
          directionForLocale(next),
          'native',
          isRTL,
        ).restartRequired;

      await setLocale(next);

      if (willRestart) {
        setPendingRestart(next);
        return;
      }
      setOpen(false);
    },
    [isRTL, setLocale],
  );

  const close = useCallback(() => {
    setOpen(false);
    setPendingRestart(null);
    setManualRestart(null);
  }, []);

  return (
    <>
      <ScalePressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        testID={testID}
        accessibilityLabel={t('a11y.language.button', { language: activeName })}
      >
        <View style={{ width: 32, height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Globe color={colors.text.secondary} size={24} strokeWidth={1.8} />
          <View
            style={{
              position: 'absolute',
              end: -4,
              bottom: -4,
              minWidth: 20,
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: radius.full,
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.border.strong,
              alignItems: 'center',
            }}
          >
            <Text
              style={{ ...typography.caption, fontSize: 10, color: colors.text.primary }}
              allowFontScaling={false}
            >
              {locale.toUpperCase()}
            </Text>
          </View>
        </View>
      </ScalePressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        testID="language-sheet"
      >
        <Pressable
          onPress={close}
          accessibilityLabel={t('a11y.close')}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'flex-end',
          }}
        >
          {/* Stop the backdrop press from closing when tapping inside the sheet. */}
          <Pressable
            onPress={() => undefined}
            style={{
              backgroundColor: colors.bg.card,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border.default,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xxl,
              paddingHorizontal: spacing.lg,
              gap: spacing.xs,
              ...shadows.card,
            }}
          >
            {pendingRestart || manualRestart ? (
              <RestartNotice
                language={
                  locales.find((option) => option.code === (pendingRestart ?? manualRestart))
                    ?.nativeName ?? ''
                }
                manual={!!manualRestart}
                onRestart={async () => {
                  const target = pendingRestart;
                  setPendingRestart(null);
                  const restarted = await applyRestart();
                  if (!restarted && target) setManualRestart(target);
                }}
                onLater={close}
              />
            ) : (
              <>
                <Text style={{ ...typography.h3, color: colors.text.primary }}>
                  {t('lang.title')}
                </Text>
                <Text
                  style={{
                    ...typography.bodySmall,
                    color: colors.text.tertiary,
                    marginBottom: spacing.sm,
                  }}
                >
                  {t('lang.subtitle')}
                </Text>
                {locales.map((option) => {
                  const selected = option.code === locale;
                  return (
                    <Pressable
                      key={option.code}
                      onPress={() => choose(option.code)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t('a11y.language.option', { language: option.nativeName })}
                      testID={`language-option-${option.code}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: spacing.md,
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: selected ? colors.border.accent : 'transparent',
                        backgroundColor: selected ? colors.bg.elevated : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          ...typography.h4,
                          color: selected ? colors.text.primary : colors.text.secondary,
                        }}
                        // Endonyms keep their own direction regardless of the UI.
                        {...dirProp(option.direction)}
                      >
                        {option.nativeName}
                      </Text>
                      {selected ? (
                        <Check color={colors.text.primary} size={20} strokeWidth={2.4} />
                      ) : (
                        <Text style={{ ...typography.caption, color: colors.text.disabled }}>
                          {option.code.toUpperCase()}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function RestartNotice({
  language,
  manual,
  onRestart,
  onLater,
}: {
  language: string;
  manual: boolean;
  onRestart: () => void;
  onLater: () => void;
}) {
  const { t } = useI18n();

  return (
    <View style={{ gap: spacing.md, paddingBottom: spacing.sm }} testID="language-restart-notice">
      <Text style={{ ...typography.h3, color: colors.text.primary }}>{t('lang.restartTitle')}</Text>
      <Text style={{ ...typography.body, color: colors.text.secondary }}>
        {manual ? t('lang.restartManual', { language }) : t('lang.restartBody', { language })}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
        {manual ? null : (
          <Pressable
            onPress={onRestart}
            accessibilityRole="button"
            accessibilityLabel={t('lang.restartNow')}
            testID="language-restart-now"
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.brand.primary,
              alignItems: 'center',
            }}
          >
            <Text style={{ ...typography.h4, color: colors.text.inverse }}>
              {t('lang.restartNow')}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onLater}
          accessibilityRole="button"
          accessibilityLabel={manual ? t('common.close') : t('common.later')}
          testID="language-restart-later"
          style={{
            flex: 1,
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border.default,
            alignItems: 'center',
          }}
        >
          <Text style={{ ...typography.h4, color: colors.text.primary }}>
            {manual ? t('common.close') : t('common.later')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
