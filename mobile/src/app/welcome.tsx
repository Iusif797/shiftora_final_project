import { useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { directionalIcon } from '@/components/ui/directional-icon';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import { colors, radius, spacing, typography } from '@/theme';

/** "Continue" arrow — a directional affordance, so it flips under RTL. */
const ForwardArrow = directionalIcon(ArrowRight);

const heroImage = require('../../assets/onboarding/hero.png');
const operationsImage = require('../../assets/onboarding/operations.png');
const successImage = require('../../assets/onboarding/success.png');

type Slide = {
  id: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  image: number;
};

const slides: Slide[] = [
  { id: '1', titleKey: 'auth.welcome.slide1Title', subtitleKey: 'auth.welcome.slide1Subtitle', image: heroImage },
  { id: '2', titleKey: 'auth.welcome.slide2Title', subtitleKey: 'auth.welcome.slide2Subtitle', image: operationsImage },
  { id: '3', titleKey: 'auth.welcome.slide3Title', subtitleKey: 'auth.welcome.slide3Subtitle', image: successImage },
];

function SlideIndicator({ current }: { current: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={{
            width: index === current ? 20 : 6,
            height: 6,
            borderRadius: radius.full,
            backgroundColor: index === current ? colors.text.primary : colors.text.tertiary,
          }}
        />
      ))}
    </View>
  );
}

const FOOTER_HEIGHT = 180;

export default function WelcomeScreen() {
  const t = useT();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  // Musi to byt hook, ne Dimensions.get() na urovni modulu: ta hodnota se sejme
  // jednou pri importu a uz nikdy se neaktualizuje. Pri otoceni zarizeni nebo ve
  // Split View na iPadu pak carousel strankuje na spatne offsety a slidy se orizly.
  const { width, height } = useWindowDimensions();

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace('/sign-in');
  };

  const handleNext = () => {
    const nextSlide = currentSlide + 1;
    if (nextSlide >= slides.length) {
      handleGetStarted();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scrollViewRef.current?.scrollTo({ x: nextSlide * width, animated: true });
    setCurrentSlide(nextSlide);
  };

  const updateSlideFromScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  const footerBottom = insets.bottom + spacing.lg;
  const contentPaddingBottom = FOOTER_HEIGHT + footerBottom;
  const imageHeight = Math.min(height * 0.5, 400);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={updateSlideFromScroll}
        onScrollEndDrag={updateSlideFromScroll}
        style={{ flex: 1 }}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={{ width, minHeight: height, paddingTop: insets.top }}>
            <View style={{ flex: 1, paddingBottom: contentPaddingBottom }}>
              <View
                style={{
                  width,
                  height: imageHeight,
                  overflow: 'hidden',
                  backgroundColor: colors.bg.card,
                }}
              >
                <Image
                  source={slide.image}
                  style={{ width, height: imageHeight }}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </View>
              <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}>
                <Text
                  style={{
                    ...typography.h1,
                    color: colors.text.primary,
                    fontSize: 28,
                    lineHeight: 34,
                  }}
                >
                  {t(slide.titleKey)}
                </Text>
                <Text
                  style={{
                    ...typography.body,
                    color: colors.text.secondary,
                    marginTop: spacing.sm,
                  }}
                >
                  {t(slide.subtitleKey)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      {/* The very first screen has to offer the language, before anyone has
          read a word of English. */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + spacing.sm,
          end: spacing.lg,
          zIndex: 10,
        }}
      >
        <LanguageSwitcher testID="welcome-language-switcher" />
      </View>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: footerBottom,
          backgroundColor: colors.bg.base,
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
        }}
      >
        <SlideIndicator current={currentSlide} />
        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton
            label={currentSlide === slides.length - 1 ? t('auth.welcome.enter') : t('common.next')}
            onPress={handleNext}
            icon={ForwardArrow}
            testID="next-button"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <SecondaryButton label={t('auth.welcome.skipToSignIn')} onPress={handleGetStarted} testID="skip-button" />
        </View>
      </View>
    </View>
  );
}
