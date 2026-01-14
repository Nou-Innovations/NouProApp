/**
 * ProductDetailPublicScreen - Public product detail view from feed
 * Shows product information with order button
 * Navigation: Product card tap from feed → this screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '@/shared/components/ui/Avatar';
import { get } from '@/shared/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.9;

interface ProductData {
  id: string;
  name: string;
  price: number;
  unit?: string;
  image?: string;
  description?: string;
  brandName?: string;
  brandLogo?: string;
  distributorName?: string;
  distributorId?: string;
  businessName?: string;
  businessLogo?: string;
  businessId?: string;
  isNew?: boolean;
  status?: string;
  category?: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetailPublic'>;

const formatPrice = (price: number): string => {
  return `Rs ${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const ProductDetailPublicScreen: React.FC<Props> = ({ route, navigation }) => {
  const { productId, businessId } = route.params;
  const { theme: appTheme } = useTheme();
  
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const product = await get<ProductData>(`/products/${productId}`);
      setProduct(product);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessPress = () => {
    const targetBusinessId = product?.distributorId || product?.businessId || businessId;
    if (targetBusinessId) {
      navigation.navigate('ViewBusinessProfile', { businessId: targetBusinessId });
    }
  };

  const adjustQuantity = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    console.log('Add to cart:', productId, 'quantity:', quantity);
    // TODO: Implement cart functionality
  };

  const handleOrder = () => {
    console.log('Order now:', productId, 'quantity:', quantity);
    // TODO: Implement direct order functionality
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader
          title="Product Details"
          leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader
          title="Product Details"
          leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={appTheme.colors.textMuted} />
          <Text style={[styles.errorText, { color: appTheme.colors.text }]}>
            {error || 'Product not found'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: appTheme.colors.primary }]}
            onPress={fetchProduct}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const businessName = product.distributorName || product.businessName;
  const businessLogo = product.brandLogo || product.businessLogo;
  const businessIdValue = product.distributorId || product.businessId;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title=""
        variant="transparent"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        style={{ position: 'absolute', top: 44, left: 0, right: 0, zIndex: 10 }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.productImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: appTheme.colors.surface }]}>
              <Icon name="cube-outline" size={80} color={appTheme.colors.textMuted} />
            </View>
          )}
          {product.isNew && (
            <View style={[styles.newBadge, { backgroundColor: appTheme.colors.success }]}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={[styles.infoContainer, { backgroundColor: appTheme.colors.cardBackground }]}>
          {/* Brand/Business Row */}
          {businessName && (
            <TouchableOpacity
              style={styles.businessRow}
              onPress={handleBusinessPress}
              activeOpacity={0.7}
            >
              <Avatar
                userId={businessIdValue || 'business'}
                userName={product.brandName || businessName}
                imageUri={businessLogo}
                size={40}
              />
              <View style={styles.businessInfo}>
                {product.brandName && (
                  <Text style={[styles.brandName, { color: appTheme.colors.text }]}>
                    {product.brandName}
                  </Text>
                )}
                <Text style={[styles.distributorName, { color: appTheme.colors.textSecondary }]}>
                  by {businessName}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
            </TouchableOpacity>
          )}

          {/* Product Name */}
          <Text style={[styles.productName, { color: appTheme.colors.text }]}>
            {product.name}
          </Text>

          {/* Unit */}
          {product.unit && (
            <Text style={[styles.productUnit, { color: appTheme.colors.textSecondary }]}>
              {product.unit}
            </Text>
          )}

          {/* Price */}
          <Text style={[styles.productPrice, { color: appTheme.colors.primary }]}>
            {formatPrice(product.price)}
          </Text>

          {/* Description */}
          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
                Description
              </Text>
              <Text style={[styles.descriptionText, { color: appTheme.colors.textSecondary }]}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
              Quantity
            </Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: appTheme.colors.surface }]}
                onPress={() => adjustQuantity(-1)}
                disabled={quantity <= 1}
              >
                <Icon 
                  name="remove" 
                  size={24} 
                  color={quantity <= 1 ? appTheme.colors.textMuted : appTheme.colors.text} 
                />
              </TouchableOpacity>
              <Text style={[styles.quantityText, { color: appTheme.colors.text }]}>
                {quantity}
              </Text>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: appTheme.colors.surface }]}
                onPress={() => adjustQuantity(1)}
                disabled={quantity >= 99}
              >
                <Icon 
                  name="add" 
                  size={24} 
                  color={quantity >= 99 ? appTheme.colors.textMuted : appTheme.colors.text} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
        <View style={styles.totalSection}>
          <Text style={[styles.totalLabel, { color: appTheme.colors.textSecondary }]}>
            Total
          </Text>
          <Text style={[styles.totalPrice, { color: appTheme.colors.text }]}>
            {formatPrice(product.price * quantity)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.orderButton, { backgroundColor: appTheme.colors.primary }]}
          onPress={handleOrder}
          activeOpacity={0.8}
        >
          <Icon name="cart-outline" size={20} color="#FFFFFF" />
          <Text style={styles.orderButtonText}>Add to Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 60,
    left: theme.spacing.md,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.bold,
    color: '#FFFFFF',
  },
  infoContainer: {
    padding: theme.spacing.md,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    marginTop: -theme.spacing.md,
    paddingBottom: 120,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  businessInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  brandName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  distributorName: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  productName: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: theme.spacing.xs,
    lineHeight: 32,
  },
  productUnit: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: theme.spacing.sm,
  },
  productPrice: {
    fontSize: 28,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: theme.spacing.md,
  },
  descriptionSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: theme.spacing.sm,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 22,
  },
  quantitySection: {
    marginTop: theme.spacing.lg,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
    marginHorizontal: theme.spacing.lg,
    minWidth: 40,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg + 10,
    borderTopWidth: 0.5,
  },
  totalSection: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
  },
  totalPrice: {
    fontSize: 22,
    fontFamily: theme.fonts.primary.bold,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
});

export default ProductDetailPublicScreen;
