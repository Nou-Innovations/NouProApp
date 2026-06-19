/**
 * ProductDetailSkeleton — full-screen skeleton that mirrors the product detail
 * layout (hero image + info sheet + related rows). Shown while the product is
 * loading so the whole screen reads as a skeleton instead of a bare spinner.
 *
 * `RelatedRowSkeleton` is also exported and reused inside the loaded screen so
 * the "More from…" sections stay skeletons until their data arrives (rather than
 * popping into empty space one by one).
 */
import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { Skeleton } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * (4 / 3);
const SHEET_OVERLAP = 24;
const MINI_CARD = 132;

/** One "More from…" section as a skeleton: title bar + a row of card skeletons. */
export function RelatedRowSkeleton({ isLast }: { isLast?: boolean }) {
  const { theme: appTheme } = useTheme();
  return (
    <View
      style={[
        styles.section,
        { borderTopColor: appTheme.colors.borderColor },
        isLast && styles.lastSection,
      ]}
    >
      <Skeleton width={160} height={18} style={{ marginBottom: 14 }} />
      <View style={styles.cardRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.card}>
            <Skeleton width={MINI_CARD} height={MINI_CARD} borderRadius={16} style={{ marginBottom: 10 }} />
            <Skeleton width="90%" height={13} style={{ marginBottom: 6 }} />
            <Skeleton width={60} height={13} />
          </View>
        ))}
      </View>
    </View>
  );
}

interface Props {
  onBack?: () => void;
}

const ProductDetailSkeleton: React.FC<Props> = ({ onBack }) => {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      {/* Hero placeholder */}
      <Skeleton width="100%" height={IMAGE_HEIGHT} borderRadius={0} />

      {/* Back button stays usable during load */}
      {onBack && (
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 6 }]}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Icon name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Info sheet */}
      <View style={[styles.sheet, { backgroundColor: appTheme.colors.cardBackground }]}>
        <View style={[styles.grabber, { backgroundColor: appTheme.colors.borderColor }]} />

        {/* Brand */}
        <Skeleton width={110} height={12} style={{ marginBottom: 12 }} />
        {/* Name (2 lines) */}
        <Skeleton width="82%" height={24} style={{ marginBottom: 8 }} />
        <Skeleton width="55%" height={24} style={{ marginBottom: 16 }} />
        {/* Price */}
        <Skeleton width={130} height={28} style={{ marginBottom: 16 }} />
        {/* Chips */}
        <View style={styles.chipsRow}>
          <Skeleton width={84} height={30} borderRadius={8} />
          <Skeleton width={110} height={30} borderRadius={8} />
        </View>
        {/* Availability pill */}
        <Skeleton width={96} height={30} borderRadius={999} style={{ marginBottom: 18 }} />
        {/* Description (3 lines) */}
        <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="65%" height={14} />

        {/* Related sections */}
        <RelatedRowSkeleton />
        <RelatedRowSkeleton isLast />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  section: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lastSection: {
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
    overflow: 'hidden',
  },
  card: {
    width: MINI_CARD,
  },
});

export default ProductDetailSkeleton;
