import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ScreenScroll } from '@/components/app-shell';
import { colors, spacing, typography } from '@/theme';

export function LegalScreen({ title, updated, sections }: { title: string; updated: string; sections: { title: string; body: string }[] }) {
  return (
    <ScreenScroll
      title={title}
      subtitle={`Last updated ${updated}`}
      leftSlot={
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace('/');
          }}
          style={{ zIndex: 999, padding: 8, marginLeft: -8 }}
          hitSlop={24}
          accessibilityLabel="Go back"
          testID="legal-back-button"
        >
          <ChevronLeft color={colors.text.primary} size={24} />
        </Pressable>
      }
    >
      <View style={{ gap: spacing.xl, paddingBottom: spacing.xxxl }}>
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={{ ...typography.h3, color: colors.text.primary }}>{section.title}</Text>
            <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: spacing.sm }}>{section.body}</Text>
          </View>
        ))}
      </View>
    </ScreenScroll>
  );
}
