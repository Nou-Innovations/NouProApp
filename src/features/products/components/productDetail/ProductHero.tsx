/**
 * ProductHero — the big product image area: a horizontally-paged image carousel,
 * stock status badges, and the ImageThumbnailStrip. Designed to sit inside an
 * Animated.View that applies the parallax transform (owned by the screen).
 */
import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { ProductAvailability } from '@/shared/types/productDetails';
import ImageThumbnailStrip from './ImageThumbnailStrip';

interface Props {
  images: string[];
  heroHeight: number;
  screenWidth: number;
  /** How far the sheet overlaps the hero bottom — keeps thumbnails above the sheet. */
  sheetOverlap: number;
  /** Safe-area top inset, so badges clear the status bar / header. */
  topInset: number;
  currentImageIndex: number;
  imageScrollRef: React.RefObject<ScrollView | null>;
  onImageScroll: (event: any) => void;
  onThumbPress: (index: number) => void;
  availability: ProductAvailability;
}

const ProductHero: React.FC<Props> = ({
  images,
  heroHeight,
  screenWidth,
  sheetOverlap,
  topInset,
  currentImageIndex,
  imageScrollRef,
  onImageScroll,
  onThumbPress,
  availability,
}) => {
  const { theme: appTheme } = useTheme();
  const hasImages = images.length > 0 && !!images[0];

  return (
    <View style={[styles.container, { height: heroHeight, backgroundColor: appTheme.colors.surface }]}>
      {hasImages ? (
        <ScrollView
          ref={imageScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onImageScroll}
          scrollEventThrottle={16}
        >
          {images.map((uri, index) => (
            <Image
              key={index}
              source={{ uri }}
              style={{ width: screenWidth, height: heroHeight }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.placeholder}>
          <Icon name="cube-outline" size={84} color={appTheme.colors.textMuted} />
        </View>
      )}

      {/* Stock status badges */}
      <View style={[styles.badges, { top: topInset + 6 }]}>
        {availability.isOutOfStock && (
          <View style={[styles.badge, { backgroundColor: appTheme.colors.error }]}>
            <Text style={styles.badgeText}>Out of Stock</Text>
          </View>
        )}
        {availability.isLowStock && !availability.isOutOfStock && (
          <View style={[styles.badge, { backgroundColor: appTheme.colors.statusLowStock }]}>
            <Text style={styles.badgeText}>Low Stock</Text>
          </View>
        )}
      </View>

      {/* Thumbnail strip (sits just above where the sheet starts) */}
      <View style={[styles.thumbRow, { bottom: sheetOverlap + 14 }]} pointerEvents="box-none">
        <ImageThumbnailStrip images={images} activeIndex={currentImageIndex} onPress={onThumbPress} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badges: {
    position: 'absolute',
    left: 16,
    gap: 8,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#FFFFFF',
  },
  thumbRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

export default ProductHero;
