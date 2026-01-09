/**
 * NewProductPost Component
 * Feed post showing new products added by distributors or received by businesses
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Avatar from '@/shared/components/ui/Avatar';

const PRODUCT_CARD_WIDTH = 160;

type PostType = 'distributor_added' | 'business_received';

interface ProductItem {
  id: string;
  name: string;
  unit?: string; // e.g. "1L", "10cmx10cm", "12Kg"
  price: number;
  image?: string;
  brandName?: string;
}

interface NewProductPostProps {
  id: string;
  postType: PostType;
  businessName: string;
  businessLogo?: string;
  businessId: string;
  products: ProductItem[];
  timestamp?: string;
  onBusinessPress?: () => void;
  onProductPress?: (productId: string) => void;
  // Note: Order functionality removed - Personal mode is browse only (per app-logic.json)
  onViewAllPress?: () => void;
}

const formatPrice = (price: number): string => {
  return `Rs ${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function NewProductPost({
  id,
  postType,
  businessName,
  businessLogo,
  businessId,
  products,
  timestamp,
  onBusinessPress,
  onProductPress,
  onViewAllPress,
}: NewProductPostProps) {
  const { theme: appTheme } = useTheme();

  const getPostTitle = () => {
    if (postType === 'distributor_added') {
      return `added new products`;
    }
    return `received new products`;
  };

  // + icon for added, down arrow for received - both in green, no circle
  const getPostIcon = (): keyof typeof Icon.glyphMap => {
    return postType === 'distributor_added' ? 'add' : 'arrow-down';
  };

  const renderProductCard = (product: ProductItem) => (
    <TouchableOpacity
      key={product.id}
      style={[styles.productCard, { backgroundColor: appTheme.colors.cardBackground }]}
      onPress={() => onProductPress?.(product.id)}
      activeOpacity={0.7}
    >
      {/* Product Image - 160x160px with border radius */}
      <View style={styles.productImageContainer}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: appTheme.colors.surface }]}>
            <Icon name="cube-outline" size={32} color={appTheme.colors.textMuted} />
          </View>
        )}
        {/* New Badge */}
        <View style={[styles.newBadge, { backgroundColor: appTheme.colors.success }]}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
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
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.businessRow}
          onPress={onBusinessPress}
          activeOpacity={0.7}
        >
          <Avatar
            userId={businessId}
            userName={businessName}
            imageUri={businessLogo}
            size={48}
            style={styles.businessLogo}
          />
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              {/* Business Name - 16px Bold primary */}
              <Text style={[styles.businessName, { color: appTheme.colors.text }]}>
                {businessName}
              </Text>
            </View>
            {/* Action Row - 14px Medium secondary with green icon */}
            <View style={styles.actionRow}>
              <Icon 
                name={getPostIcon()} 
                size={14} 
                color={appTheme.colors.success} 
                style={styles.actionIcon}
              />
              <Text style={[styles.postAction, { color: appTheme.colors.textSecondary }]}>
                {getPostTitle()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Products Count */}
      <View style={styles.productsCountRow}>
        <View style={[styles.countBadge, { backgroundColor: appTheme.colors.surface }]}>
          <Text style={[styles.countText, { color: appTheme.colors.text }]}>
            {products.length} new {products.length === 1 ? 'product' : 'products'}
          </Text>
        </View>
        {onViewAllPress && products.length > 3 && (
          <TouchableOpacity onPress={onViewAllPress} activeOpacity={0.7}>
            <Text style={[styles.viewAllText, { color: appTheme.colors.info }]}>
              View All
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessLogo: {
    borderRadius: theme.borderRadius.md,
  },
  headerContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Business Name - 16px Bold primary
  businessName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  actionIcon: {
    marginRight: 4,
  },
  // Post Action - 14px Medium secondary
  postAction: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  productsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  countBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
  },
  countText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  viewAllText: {
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
    borderRadius: theme.borderRadius.md,
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
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 4,
    lineHeight: 20,
  },
  // Unit - 14px secondary
  productUnit: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 4,
  },
  // Price - 16px Medium primary
  productPrice: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default NewProductPost;
