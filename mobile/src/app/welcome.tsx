import { useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { AuthBackground } from '@/components/app-shell';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { colors, radius, spacing, typography } from '@/theme';

const { width, height } = Dimensions.get('window');
const heroImage = require('../../assets/onboarding/hero.png');
const operationsImage = require('../../assets/onboarding/operations.png');
const successImage = require('../../assets/onboarding/success.png');

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  image: number;
};

const slides: Slide[] = [
  { id: '1', title: 'Manage shifts easily', subtitle: 'Plan and track team schedules', image: heroImage },
  { id: '2', title: 'Track attendance', subtitle: 'Check-in and monitor staff presence', image: operationsImage },
  { id: '3', title: 'Team analytics', subtitle: 'See performance and staffing insights', image: successImage },
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

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

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  const footerBottom = insets.bottom + spacing.lg;
  const contentPaddingBottom = FOOTER_HEIGHT + footerBottom;
  const imageHeight = Math.min(height * 0.5, 400);

  return (
    <AuthBackground>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
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
                  {slide.title}
                </Text>
                <Text
                  style={{
                    ...typography.body,
                    color: colors.text.secondary,
                    marginTop: spacing.sm,
                  }}
                >
                  {slide.subtitle}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
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
            label={currentSlide === slides.length - 1 ? 'Enter Shiftora' : 'Continue'}
            onPress={handleNext}
            icon={ArrowRight}
            testID="next-button"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <SecondaryButton label="Skip to sign in" onPress={handleGetStarted} testID="skip-button" />
        </View>
      </View>
    </AuthBackground>
  );
}
