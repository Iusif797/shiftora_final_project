import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import PagerView from 'react-native-pager-view';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { colors, fonts, radius, spacing, typography } from '@/theme';

const heroImage = require('../../assets/onboarding/hero.png');
const operationsImage = require('../../assets/onboarding/operations.png');
const successImage = require('../../assets/onboarding/success.png');

type Slide = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  image: number;
};

const slides: Slide[] = [
  {
    id: '1',
    tag: 'Shift Management',
    title: 'Manage shifts easily',
    subtitle: 'Plan, organize and track team schedules seamlessly in real-time.',
    image: heroImage,
  },
  {
    id: '2',
    tag: 'Live Presence',
    title: 'Track attendance',
    subtitle: 'Check-in staff and monitor real-time presence across all stations.',
    image: operationsImage,
  },
  {
    id: '3',
    tag: 'Insights & Growth',
    title: 'Team analytics',
    subtitle: 'Gain actionable insights on staffing efficiency and performance.',
    image: successImage,
  },
];

function SlideIndicator({
  current,
  onSelect,
}: {
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <View style={styles.indicatorContainer}>
      {slides.map((_, index) => {
        const isActive = index === current;
        return (
          <Pressable
            key={index}
            onPress={() => onSelect(index)}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel={`Go to slide ${index + 1}`}
            style={[
              styles.indicatorDot,
              isActive ? styles.indicatorActive : styles.indicatorInactive,
            ]}
          />
        );
      })}
    </View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  const footerBottom = Math.max(insets.bottom, spacing.md) + spacing.md;
  const contentPaddingBottom = 160 + footerBottom;

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace('/sign-in');
  };

  const handleNext = () => {
    console.log('Next button pressed. Current slide:', currentSlide);
    const nextIndex = currentSlide + 1;
    if (nextIndex >= slides.length) {
      handleGetStarted();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pagerRef.current?.setPage(nextIndex);
  };

  const handleSelectSlide = (index: number) => {
    if (index === currentSlide) return;
    Haptics.selectionAsync();
    pagerRef.current?.setPage(index);
  };

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={StyleSheet.absoluteFill}
        initialPage={0}
        onPageSelected={(e) => {
          console.log('Page selected:', e.nativeEvent.position);
          setCurrentSlide(e.nativeEvent.position);
        }}
        overdrag={true}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={styles.page}>
            <Image
              source={slide.image}
              recyclingKey={slide.id}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              priority="high"
            />

            <LinearGradient
              colors={[
                'rgba(0, 0, 0, 0.45)',
                'rgba(0, 0, 0, 0.1)',
                'rgba(0, 0, 0, 0.35)',
                'rgba(0, 0, 0, 0.85)',
                '#000000',
              ]}
              locations={[0, 0.2, 0.5, 0.72, 0.95]}
              style={StyleSheet.absoluteFill}
            />

            <View
              style={[
                styles.slideContent,
                {
                  paddingBottom: contentPaddingBottom,
                  paddingTop: insets.top + spacing.xl,
                },
              ]}
            >
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          </View>
        ))}
      </PagerView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: footerBottom,
          },
        ]}
        pointerEvents="box-none"
      >
        <SlideIndicator current={currentSlide} onSelect={handleSelectSlide} />

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton
            label={currentSlide === slides.length - 1 ? 'Enter Shiftora' : 'Continue'}
            onPress={handleNext}
            icon={ArrowRight}
            testID="next-button"
          />
        </View>

        <View style={{ marginTop: spacing.sm }}>
          <SecondaryButton
            label="Skip to sign in"
            onPress={handleGetStarted}
            testID="skip-button"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  page: {
    flex: 1,
    position: 'relative',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.display,
    fontFamily: fonts.extrabold,
    fontWeight: '800',
    fontSize: 32,
    lineHeight: 38,
    color: colors.text.primary,
    letterSpacing: -1,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: 'transparent',
    zIndex: 10,
    elevation: 10,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  indicatorDot: {
    height: 6,
    borderRadius: radius.full,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: colors.text.primary,
  },
  indicatorInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
