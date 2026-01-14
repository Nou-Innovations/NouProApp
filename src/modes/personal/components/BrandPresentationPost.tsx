/**
 * BrandPresentationPost Component
 * Feed post showing a brand presentation with logo, name, distributor and product cards
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Avatar from '@/shared/components/ui/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = 160;

interface ProductItem {
  id: string;
  name: string;
  description?: string;
  unit?: string; // e.g. "1L", "10cmx10cm", "12Kg"
  price: number;
  image?: string;
  isNew?: boolean;
}

interface BrandPresentationPostProps {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo?: string;
  distributorName: string;
  distributorId: string;
  products: ProductItem[];
  timestamp?: string;
  onBrandPress?: (brandId: string, distributorId: string) => void;
  onDistributorPress?: () => void;
  onProductPress?: (productId: string) => void;
  // Note: Order functionality removed - Personal mode is browse only (per app-logic.json)
}

const formatPrice = (price: number): string => {
  return `Rs ${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function BrandPresentationPost({
  id,
  brandId,
  brandName,
  brandLogo,
  distributorName,
  distributorId,
  products,
  timestamp,
  onBrandPress,
  onDistributorPress,
  onProductPress,
}: BrandPresentationPostProps) {
  const { theme: appTheme } = useTheme();

  const renderProductCard = (product: ProductItem) => (
    <TouchableOpacity
      key={product.id}
      style={[styles.productCard, { backgroundColor: appTheme.colors.cardBackground }]}
      onPress={() => onProductPress?.(product.id)}
      activeOpacity={0.7}
    >
      {/* Product Image - 160x160px */}
      <View style={styles.productImageContainer}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: appTheme.colors.surface }]}>
            <Icon name="cube-outline" size={32} color={appTheme.colors.textMuted} />
          </View>
        )}
        {/* New Badge */}
        {product.isNew && (
          <View style={[styles.newBadge, { backgroundColor: appTheme.colors.success }]}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        {/* Product Name - 16px SemiBold primary */}
        <Text
          style={[styles.productName, { color: appTheme.colors.text }]}
          numberOfLines={2}
        >
          {product.name}
        </Text>
        
        {/* Unit - 14px secondary */}
        {product.unit && (
          <Text
            style={[styles.productUnit, { color: appTheme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {product.unit}
          </Text>
        )}

        {/* Price - 16px Medium primary */}
        <Text style={[styles.productPrice, { color: appTheme.colors.text }]}>
          {formatPrice(product.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.cardBackground, borderBottomColor: appTheme.colors.borderColor }]}>
      {/* Brand Header */}
      <TouchableOpacity
        style={styles.brandHeader}
        onPress={() => onBrandPress?.(brandId, distributorId)}
        activeOpacity={0.7}
      >
        <Avatar
          userId={id}
          userName={brandName}
          imageUri={brandLogo}
          size={48}
          style={styles.brandLogo}
        />
        <View style={styles.brandInfo}>
          {/* Brand Name - 16px Bold primary */}
          <Text style={[styles.brandName, { color: appTheme.colors.text }]}>
            {brandName}
          </Text>
          {/* Distributor Name - 14px Medium secondary */}
          <TouchableOpacity onPress={onDistributorPress} activeOpacity={0.7}>
            <Text style={[styles.distributorName, { color: appTheme.colors.textSecondary }]}>
              by {distributorName}
            </Text>
          </TouchableOpacity>
        </View>
        <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
      </TouchableOpacity>

      {/* Products Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsContainer}
        decelerationRate="fast"
        snapToInterval={PRODUCT_CARD_WIDTH + theme.spacing.sm}
      >
        {products.map(renderProductCard)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0.5,
    paddingBottom: theme.spacing.md,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  brandLogo: {
    borderRadius: theme.borderRadius.md,
  },
  brandInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  // Brand Name - 16px Bold primary
  brandName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 2,
  },
  // Distributor Name - 14px Medium secondary
  distributorName: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  productsContainer: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginRight: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  // Product Image - 160x160px with border radius
  productImageContainer: {
    width: PRODUCT_CARD_WIDTH,
    height: PRODUCT_CARD_WIDTH,
    borderTopLeftRadius: theme.borderRadius.md,
    borderTopRightRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: theme.borderRadius.md,
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontFamily: theme.fonts.primary.bold,
    color: '#FFFFFF',
  },
  productInfo: {
    padding: theme.spacing.sm,
  },
  // Product Name - 16px SemiBold primary
  productName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 4,
    lineHeight: 20,
  },
  // Unit - 14px secondary
  productUnit: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 4,
  },
  // Price - 16px Medium primary
  productPrice: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default BrandPresentationPost;
