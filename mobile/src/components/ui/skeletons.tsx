import { View } from 'react-native';
import { HighlightCard, SurfaceCard } from '@/components/cards';
import { Skeleton } from '@/components/ui/skeleton';
import { colors, layout, radius, spacing } from '@/theme';

interface CountProps {
  count?: number;
}

interface RowsProps {
  rows?: number;
}

export function HeroSkeleton() {
  return (
    <HighlightCard>
      <Skeleton width={120} height={12} />
      <Skeleton width="65%" height={30} style={{ marginTop: spacing.md }} />
      <Skeleton width="45%" height={12} style={{ marginTop: spacing.md }} />
    </HighlightCard>
  );
}

function MetricCardSkeleton() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border.default,
        padding: spacing.lg,
      }}
    >
      <Skeleton width={36} height={36} radius={radius.md} />
      <Skeleton width="60%" height={24} style={{ marginTop: spacing.md }} />
      <Skeleton width="80%" height={11} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

export function MetricGridSkeleton({ rows = 1 }: RowsProps) {
  return (
    <View style={{ gap: layout.cardGap }}>
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', gap: layout.cardGap }}>
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </View>
      ))}
    </View>
  );
}

export function CardListSkeleton({ count = 3 }: CountProps) {
  return (
    <View style={{ gap: layout.cardGap }}>
      {Array.from({ length: count }, (_, index) => (
        <SurfaceCard key={index}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Skeleton width={44} height={44} radius={radius.full} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={11} />
            </View>
            <Skeleton width={64} height={22} radius={radius.full} />
          </View>
        </SurfaceCard>
      ))}
    </View>
  );
}

export function TileGridSkeleton({ count = 6 }: CountProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: layout.cardGap }}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={{
            width: '47%',
            backgroundColor: colors.bg.card,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border.default,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Skeleton width={32} height={32} radius={radius.md} />
          <Skeleton width="70%" height={14} />
          <Skeleton width="45%" height={11} />
        </View>
      ))}
    </View>
  );
}
