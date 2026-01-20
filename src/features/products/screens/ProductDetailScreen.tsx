/**
 * ProductDetailScreen - Unified product detail view
 * 
 * THREE viewing modes based on app mode and product ownership:
 * 
 * 1. PERSONAL MODE: Browsing only, NO action buttons
 *    - Shows product info, description, related products sections
 *    - Users can browse but CANNOT order (per app-logic.json)
 * 
 * 2. BUSINESS MODE - OWNER: When viewing your own company's products
 *    - Shows Edit button
 *    - Shows owner details (SKU, Barcode, Stock, Tax, Supplier)
 * 
 * 3. BUSINESS MODE - BUYER: When viewing other company's products
 *    - Shows Order button with quantity selector
 *    - Shows related products sections (More from brand, From company, Explore more)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsPersonalMode, useIsBusinessMode, useProfileStore } from '@/shared/store/profileStore';
import apiClient, { ApiError } from '@/shared/services/api';
import {
  ProductDetailsDTO,
  ProductCore,
  ProductPricing,
  ProductAvailability,
  SellerInfo,
  computeViewerContext,
  adjustBuyerCapabilitiesForAvailability,
  formatPrice,
  DEFAULT_CURRENCY,
  RelatedProduct,
} from '@/shared/types/productDetails';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Image must be 3:4 ratio (width:height = 3:4)
const IMAGE_HEIGHT = SCREEN_WIDTH * (4 / 3);

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

// ============================================================================
// Mock Data Transformer (converts API response to DTO)
// ============================================================================

function transformToDTO(
  apiProduct: any,
  activeCompanyId: string | null
): ProductDetailsDTO {
  // Product core
  const product: ProductCore = {
    id: apiProduct.id,
    name: apiProduct.name,
    description: apiProduct.description,
    images: apiProduct.image ? [apiProduct.image] : 
            apiProduct.images ? apiProduct.images : 
            apiProduct.productPicture ? [apiProduct.productPicture] : [],
    sku: apiProduct.sku,
    barcode: apiProduct.barcode,
    brand: apiProduct.brand || apiProduct.brandName,
    brandLogo: apiProduct.brandLogo,
    category: apiProduct.category,
    tags: apiProduct.tags,
    unit: apiProduct.unit,
    unitQuantity: apiProduct.unitQuantity || apiProduct.packSize,
    supplier: apiProduct.supplier || apiProduct.supplierName,
    variants: apiProduct.variants,
    isPublished: apiProduct.is_listed ?? apiProduct.isPublished ?? true,
    isArchived: apiProduct.isArchived ?? false,
    createdAt: apiProduct.created_at,
    updatedAt: apiProduct.updated_at,
  };

  // Pricing
  const pricing: ProductPricing = {
    basePrice: apiProduct.price || apiProduct.currentPrice || 0,
    currency: apiProduct.currency || DEFAULT_CURRENCY,
    costPrice: apiProduct.cost_price || apiProduct.costPrice,
    taxRate: apiProduct.taxRate,
    tiers: apiProduct.priceTiers,
    promo: apiProduct.originalPrice && apiProduct.originalPrice > (apiProduct.price || apiProduct.currentPrice)
      ? {
          price: apiProduct.price || apiProduct.currentPrice,
          percentOff: Math.round((1 - (apiProduct.price || apiProduct.currentPrice) / apiProduct.originalPrice) * 100),
        }
      : undefined,
  };

  // Store original price for display
  if (apiProduct.originalPrice && apiProduct.originalPrice > pricing.basePrice) {
    (pricing as any).originalPrice = apiProduct.originalPrice;
  }

  // Availability
  const stockQty = apiProduct.stockQuantity ?? apiProduct.stock_quantity ?? apiProduct.stock;
  const minAlert = apiProduct.min_stock_alert ?? apiProduct.minThreshold ?? 5;
  const rawStatus = apiProduct.status || 'Available';
  
  // Map to UIProductStatus format
  const statusMap: Record<string, string> = {
    'available': 'Available',
    'out_of_stock': 'Out of Stock',
    'in_production': 'In Production',
    'discontinued': 'Discontinued',
    'inactive': 'Inactive',
    'low_stock': 'Available', // Treat low stock as available
  };
  const status = statusMap[rawStatus.toLowerCase()] || rawStatus;
  
  const availability: ProductAvailability = {
    status: status as any,
    stockQuantity: stockQty,
    minStockAlert: minAlert,
    isLowStock: stockQty !== undefined && stockQty <= minAlert && stockQty > 0,
    isOutOfStock: stockQty !== undefined ? stockQty <= 0 : status === 'out_of_stock' || status === 'Out of Stock',
    moq: apiProduct.moq || apiProduct.minOrderQuantity,
    maxOrderQuantity: apiProduct.maxOrderQuantity,
    leadTime: apiProduct.leadTime,
    restockDate: apiProduct.restockDate,
  };

  // Seller info
  const seller: SellerInfo = {
    companyId: apiProduct.companyId || apiProduct.business_id || apiProduct.businessId || apiProduct.distributorId || '',
    companyName: apiProduct.companyName || apiProduct.businessName || apiProduct.distributorName || '',
    companyLogo: apiProduct.companyLogo || apiProduct.businessLogo || apiProduct.brandLogo,
    location: apiProduct.location,
    isVerified: apiProduct.isVerified,
    rating: apiProduct.rating,
    responseTime: apiProduct.responseTime,
  };

  // Viewer context
  const viewerContext = computeViewerContext(seller.companyId, activeCompanyId);
  
  // Adjust buyer capabilities based on availability
  if (viewerContext.buyerCapabilities) {
    viewerContext.buyerCapabilities = adjustBuyerCapabilitiesForAvailability(
      viewerContext.buyerCapabilities,
      availability
    );
  }

  return {
    product,
    pricing,
    availability,
    seller,
    viewerContext,
  };
}

// ============================================================================
// Main Component
// ============================================================================

const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { productId } = route.params;
  const { theme: appTheme } = useTheme();
  const { activeBusiness } = useProfileStore();
  const activeCompanyId = activeBusiness?.id || null;
  
  // App mode detection
  const isPersonalMode = useIsPersonalMode();
  const isBusinessMode = useIsBusinessMode();

  // State
  const [dto, setDto] = useState<ProductDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Order flow state (buyer mode)
  const [isOrdering, setIsOrdering] = useState(false);
  const [quantity, setQuantity] = useState(1);
  
  // Related products (buyer mode only)
  const [sameBrandProducts, setSameBrandProducts] = useState<RelatedProduct[]>([]);
  const [sameCompanyProducts, setSameCompanyProducts] = useState<RelatedProduct[]>([]);
  const [sameCategoryProducts, setSameCategoryProducts] = useState<RelatedProduct[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const imageScrollRef = useRef<ScrollView>(null);

  // Fetch product data
  useEffect(() => {
    fetchProduct();
  }, [productId, activeCompanyId]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // apiClient.get returns data directly (unwrapped)
      const productData = await apiClient.get<any>(`/products/${productId}`);
      
      if (productData) {
        const productDTO = transformToDTO(productData, activeCompanyId);
        setDto(productDTO);
        
        // Set initial quantity to MOQ if specified
        if (productDTO.availability.moq && productDTO.availability.moq > 1) {
          setQuantity(productDTO.availability.moq);
        }
        
        // Fetch related products for buyer mode
        if (!productDTO.viewerContext.isOwner) {
          setSameBrandProducts(createMockSameBrandProducts());
          setSameCompanyProducts(createMockSameCompanyProducts());
          setSameCategoryProducts(createMockSameCategoryProducts());
        }
      } else {
        throw new Error('Product not found');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      
      // Use mock data in dev mode
      if (__DEV__) {
        const mockProduct = createMockProduct(productId, activeCompanyId);
        
        // Debug logging
        console.log('[ProductDetail] productId:', productId);
        console.log('[ProductDetail] activeCompanyId:', activeCompanyId);
        console.log('[ProductDetail] seller.companyId:', mockProduct.seller.companyId);
        console.log('[ProductDetail] isOwner:', mockProduct.viewerContext.isOwner);
        
        setDto(mockProduct);
        
        // Always load related products - display logic handles when to show them
        // (Personal mode & Business Buyer mode show them, Business Owner mode doesn't)
        setSameBrandProducts(createMockSameBrandProducts());
        setSameCompanyProducts(createMockSameCompanyProducts());
        setSameCategoryProducts(createMockSameCategoryProducts());
      } else {
        setError('Failed to load product');
      }
    } finally {
      setLoading(false);
    }
  };

  // Image carousel scroll handler
  const handleImageScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    setCurrentImageIndex(pageNum);
  };

  // Actions
  const handleShare = async () => {
    if (!dto) return;
    
    try {
      await Share.share({
        message: `Check out ${dto.product.name} - ${formatPrice(dto.pricing.basePrice, dto.pricing.currency)}`,
        url: `https://noupro.com/products/${productId}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
  };

  const handleBusinessPress = () => {
    if (dto?.seller.companyId) {
      navigation.navigate('ViewBusinessProfile', { businessId: dto.seller.companyId });
    }
  };

  // Owner action - Navigate to CreateProduct screen with product data for editing
  const handleEdit = () => {
    if (!dto?.product) {
      Alert.alert('Edit Product', 'Product details not loaded yet.');
      return;
    }
    // Navigate to CreateProduct with the product data for editing
    navigation.navigate('CreateProduct' as never, { product: dto.product } as never);
  };

  // Buyer actions
  const handleOrderPress = () => {
    setIsOrdering(true);
    setQuantity(dto?.availability.moq || 1);
  };

  const handleAddToCart = () => {
    console.log('Add to cart:', productId, 'qty:', quantity);
    Alert.alert('Added to Cart', `${quantity} x ${dto?.product.name} added to cart`);
    setIsOrdering(false);
    setQuantity(1);
  };

  const handleRemove = () => {
    setIsOrdering(false);
    setQuantity(1);
  };

  const adjustQuantity = (delta: number) => {
    const moq = dto?.availability.moq || 1;
    const maxQty = dto?.availability.maxOrderQuantity || 99;
    let newQuantity = quantity + delta;
    
    if (newQuantity < moq) newQuantity = moq;
    if (newQuantity > maxQty) newQuantity = maxQty;
    
    setQuantity(newQuantity);
  };

  // Related product tap
  const handleRelatedProductPress = (relatedProductId: string) => {
    navigation.push('ProductDetail', { productId: relatedProductId });
  };

  // Format unit display (e.g., "0.5L x 10")
  const formatUnitDisplay = (unit?: string, unitQuantity?: number) => {
    if (!unit) return null;
    if (unitQuantity && unitQuantity > 1) {
      return `${unit} x ${unitQuantity}`;
    }
    return unit;
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !dto) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: appTheme.colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { product, pricing, availability, seller, viewerContext } = dto;
  const images = product.images.length > 0 ? product.images : [''];
  const unitDisplay = formatUnitDisplay(product.unit, product.unitQuantity);
  const hasOriginalPrice = (pricing as any).originalPrice && (pricing as any).originalPrice > pricing.basePrice;
  const totalPrice = pricing.basePrice * quantity;

  // ============================================================================
  // THREE-MODE LOGIC (per app-logic.json)
  // ============================================================================
  // 1. Personal Mode: Browse only, NO action buttons, show related products
  // 2. Business Mode Owner: Edit button, show owner details
  // 3. Business Mode Buyer: Order button, show related products
  
  const isProductOwner = isBusinessMode && viewerContext.isOwner;
  const canOrder = isBusinessMode && !viewerContext.isOwner;
  const showRelatedProducts = isPersonalMode || canOrder; // Personal & Business Buyer modes
  const showOwnerDetails = isProductOwner;
  const showActionBar = isBusinessMode; // Only Business mode has action buttons

  // Debug: Log mode decision
  if (__DEV__) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║          PRODUCT DETAIL SCREEN RENDER              ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log('║ productId:', productId);
    console.log('║ isPersonalMode:', isPersonalMode);
    console.log('║ isBusinessMode:', isBusinessMode);
    console.log('║ viewerContext.isOwner:', viewerContext.isOwner);
    console.log('║ ───────────────────────────────────────────────────');
    console.log('║ isProductOwner:', isProductOwner);
    console.log('║ canOrder:', canOrder);
    console.log('║ showRelatedProducts:', showRelatedProducts);
    console.log('║ showActionBar:', showActionBar);
    console.log('║ ───────────────────────────────────────────────────');
    if (isPersonalMode) {
      console.log('║ MODE: 👁️ PERSONAL (Browse only, no buttons)');
    } else if (isProductOwner) {
      console.log('║ MODE: 🔧 BUSINESS OWNER (Edit button)');
    } else {
      console.log('║ MODE: 🛒 BUSINESS BUYER (Order button)');
    }
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
  }

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      {/* Sticky Header Controls */}
      <SafeAreaView style={styles.stickyControls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.rightControls}>
            {/* Save button (Personal mode and Business Buyer mode) */}
            {(isPersonalMode || canOrder) && (
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                onPress={handleSave}
              >
                <Icon 
                  name={isSaved ? 'bookmark' : 'bookmark-outline'} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
            )}
            
            {/* Share button */}
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
              onPress={handleShare}
            >
              <Icon name="share-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Scrollable Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Image Carousel - 3/4 screen height */}
        <View style={[styles.carouselContainer, { height: IMAGE_HEIGHT }]}>
          {images.length > 0 && images[0] ? (
            <ScrollView
              ref={imageScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleImageScroll}
              scrollEventThrottle={16}
            >
              {images.map((uri, index) => (
                <Image
                  key={index}
                  source={{ uri }}
                  style={[styles.carouselImage, { width: SCREEN_WIDTH }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: appTheme.colors.surface }]}>
              <Icon name="cube-outline" size={80} color={appTheme.colors.textMuted} />
            </View>
          )}
          
          {/* Dot Indicators */}
          {images.length > 1 && (
            <View style={styles.dotContainer}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: index === currentImageIndex 
                        ? appTheme.colors.primary 
                        : 'rgba(255,255,255,0.5)'
                    }
                  ]}
                />
              ))}
            </View>
          )}

          {/* Status Badges */}
          <View style={styles.badgeContainer}>
            {availability.isOutOfStock && (
              <View style={[styles.badge, { backgroundColor: appTheme.colors.error }]}>
                <Text style={styles.badgeText}>Out of Stock</Text>
              </View>
            )}
            {availability.isLowStock && !availability.isOutOfStock && (
              <View style={[styles.badge, { backgroundColor: appTheme.colors.warning }]}>
                <Text style={styles.badgeText}>Low Stock</Text>
              </View>
            )}
          </View>
        </View>

        {/* Product Info Section */}
        <View style={[styles.infoContainer, { backgroundColor: appTheme.colors.cardBackground }]}>
          {/* Product Name - 24px semibold primary */}
          <Text style={[styles.productName, { color: appTheme.colors.text }]}>
            {product.name}
          </Text>

          {/* Unit + Quantity - 16px medium secondary */}
          {unitDisplay && (
            <View style={[styles.unitBox, { backgroundColor: appTheme.colors.surface }]}>
              <Text style={[styles.unitText, { color: appTheme.colors.textSecondary }]}>
                {unitDisplay}
              </Text>
            </View>
          )}

          {/* Price Block - 20px medium primary, sale price handling */}
          <View style={styles.priceBlock}>
            {hasOriginalPrice && (
              <View style={styles.originalPriceContainer}>
                <Text style={[styles.originalPrice, { color: appTheme.colors.textSecondary }]}>
                  {formatPrice((pricing as any).originalPrice, pricing.currency)}
                </Text>
                <View style={[styles.strikethrough, { backgroundColor: appTheme.colors.error }]} />
              </View>
            )}
            <Text style={[styles.currentPrice, { color: appTheme.colors.text }]}>
              {formatPrice(pricing.basePrice, pricing.currency)}
            </Text>
          </View>

          {/* Description - 14px medium primary, 2 lines then expand */}
          {product.description && (
            <TouchableWithoutFeedback onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
              <View style={styles.descriptionSection}>
                <Text
                  style={[styles.descriptionText, { color: appTheme.colors.text }]}
                  numberOfLines={isDescriptionExpanded ? undefined : 2}
                >
                  {product.description}
                </Text>
                {product.description.length > 100 && (
                  <Text style={[styles.seeMoreText, { color: appTheme.colors.primary }]}>
                    {isDescriptionExpanded ? 'See less' : 'See more'}
                  </Text>
                )}
              </View>
            </TouchableWithoutFeedback>
          )}

          {/* Business Owner Mode: Product Details (SKU, Barcode, Stock, Tax, Supplier) */}
          {showOwnerDetails && (
            <View style={styles.ownerDetailsSection}>
              {product.sku && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: appTheme.colors.textSecondary }]}>SKU</Text>
                  <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{product.sku}</Text>
                </View>
              )}
              
              {product.barcode && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: appTheme.colors.textSecondary }]}>Barcode</Text>
                  <View style={styles.barcodeContainer}>
                    <Icon name="barcode-outline" size={16} color={appTheme.colors.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{product.barcode}</Text>
                  </View>
                </View>
              )}
              
              {availability.stockQuantity !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: appTheme.colors.textSecondary }]}>Stock</Text>
                  <Text style={[
                    styles.detailValue, 
                    { color: availability.isLowStock ? appTheme.colors.warning : appTheme.colors.text }
                  ]}>
                    {availability.stockQuantity} units
                    {availability.isLowStock && ' (Low)'}
                  </Text>
                </View>
              )}
              
              {pricing.taxRate !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: appTheme.colors.textSecondary }]}>Tax</Text>
                  <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{pricing.taxRate}%</Text>
                </View>
              )}
              
              {product.supplier && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: appTheme.colors.textSecondary }]}>Supplier</Text>
                  <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{product.supplier}</Text>
                </View>
              )}
            </View>
          )}

          {/* Related Products Sections (Personal mode and Business Buyer mode) */}
          {showRelatedProducts && (
            <>
              {/* More from Brand */}
              {sameBrandProducts.length > 0 && product.brand && (
                <View style={styles.relatedSection}>
                  <Text style={[styles.relatedTitle, { color: appTheme.colors.text }]}>
                    More from {product.brand}
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.relatedScrollContent}
                  >
                    {sameBrandProducts.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.relatedCard}
                        onPress={() => handleRelatedProductPress(item.id)}
                      >
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.relatedImage} />
                        ) : (
                          <View style={[styles.relatedImagePlaceholder, { backgroundColor: appTheme.colors.surface }]}>
                            <Icon name="cube-outline" size={24} color={appTheme.colors.textMuted} />
                          </View>
                        )}
                        <Text style={[styles.relatedName, { color: appTheme.colors.text }]} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={[styles.relatedPrice, { color: appTheme.colors.textSecondary }]}>
                          {formatPrice(item.price, item.currency)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* From Company */}
              {sameCompanyProducts.length > 0 && seller.companyName && (
                <View style={styles.relatedSection}>
                  <Text style={[styles.relatedTitle, { color: appTheme.colors.text }]}>
                    From {seller.companyName}
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.relatedScrollContent}
                  >
                    {sameCompanyProducts.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.relatedCard}
                        onPress={() => handleRelatedProductPress(item.id)}
                      >
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.relatedImage} />
                        ) : (
                          <View style={[styles.relatedImagePlaceholder, { backgroundColor: appTheme.colors.surface }]}>
                            <Icon name="cube-outline" size={24} color={appTheme.colors.textMuted} />
                          </View>
                        )}
                        <Text style={[styles.relatedName, { color: appTheme.colors.text }]} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={[styles.relatedPrice, { color: appTheme.colors.textSecondary }]}>
                          {formatPrice(item.price, item.currency)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Explore More (same category) */}
              {sameCategoryProducts.length > 0 && (
                <View style={[styles.relatedSection, styles.lastRelatedSection]}>
                  <Text style={[styles.relatedTitle, { color: appTheme.colors.text }]}>
                    Explore more
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.relatedScrollContent}
                  >
                    {sameCategoryProducts.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.relatedCard}
                        onPress={() => handleRelatedProductPress(item.id)}
                      >
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.relatedImage} />
                        ) : (
                          <View style={[styles.relatedImagePlaceholder, { backgroundColor: appTheme.colors.surface }]}>
                            <Icon name="cube-outline" size={24} color={appTheme.colors.textMuted} />
                          </View>
                        )}
                        <Text style={[styles.relatedName, { color: appTheme.colors.text }]} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={[styles.relatedPrice, { color: appTheme.colors.textSecondary }]}>
                          {formatPrice(item.price, item.currency)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar - BUSINESS MODE ONLY */}
      {/* Personal Mode: No action bar (browse only per app-logic.json) */}
      {showActionBar && (
        <View style={[styles.bottomBar, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
          {isProductOwner ? (
            /* Business Owner Mode: Edit button only */
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: appTheme.colors.primary }]}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Icon name="create-outline" size={20} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : isOrdering ? (
            /* Business Buyer Mode: Order flow expanded */
            <View style={styles.orderFlowContainer}>
              {/* Quantity selector */}
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={[styles.quantityButton, { backgroundColor: appTheme.colors.surface }]}
                  onPress={() => adjustQuantity(-1)}
                >
                  <Icon name="remove" size={20} color={appTheme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.quantityText, { color: appTheme.colors.text }]}>{quantity}</Text>
                <TouchableOpacity
                  style={[styles.quantityButton, { backgroundColor: appTheme.colors.surface }]}
                  onPress={() => adjustQuantity(1)}
                >
                  <Icon name="add" size={20} color={appTheme.colors.text} />
                </TouchableOpacity>
              </View>
              
              {/* Total amount */}
              <Text style={[styles.totalAmount, { color: appTheme.colors.text }]}>
                {formatPrice(totalPrice, pricing.currency)}
              </Text>
              
              {/* Buttons with 0px gap */}
              <View style={styles.orderButtonsContainer}>
                <TouchableOpacity
                  style={[styles.addToCartButton, { backgroundColor: appTheme.colors.primary }]}
                  onPress={handleAddToCart}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addToCartButtonText}>Add to cart</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: appTheme.colors.surface }]}
                  onPress={handleRemove}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.removeButtonText, { color: appTheme.colors.textSecondary }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Business Buyer Mode: Order button */
            <TouchableOpacity
              style={[
                styles.orderButton, 
                { backgroundColor: availability.isOutOfStock ? appTheme.colors.surface : appTheme.colors.primary }
              ]}
              onPress={handleOrderPress}
              activeOpacity={0.8}
              disabled={availability.isOutOfStock}
            >
              <Text style={[
                styles.orderButtonText,
                { color: availability.isOutOfStock ? appTheme.colors.textMuted : '#FFFFFF' }
              ]}>
                {availability.isOutOfStock ? 'Out of Stock' : 'Order'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// ============================================================================
// Mock Data Generators (for development)
// ============================================================================

function createMockProduct(productId: string, activeCompanyId: string | null): ProductDetailsDTO {
  // DETERMINE OWNERSHIP based on productId pattern:
  // - 'PRD-xxx' = Products from Business's own catalog (Products tab) → OWNER MODE
  // - 'own-xxx' = Explicitly marked as owned → OWNER MODE  
  // - 'prod-xxx', 'new-xxx', 'brand-xxx' = Feed products from other companies → BUYER MODE
  // - Everything else = Assume feed/other company → BUYER MODE
  const isOwnerProduct = productId.startsWith('PRD-') || productId.startsWith('own-');
  
  // Debug logging
  if (__DEV__) {
    console.log('======= MOCK PRODUCT CREATION =======');
    console.log('productId:', productId);
    console.log('Pattern check: PRD-?', productId.startsWith('PRD-'));
    console.log('Pattern check: own-?', productId.startsWith('own-'));
    console.log('isOwnerProduct:', isOwnerProduct);
    console.log('activeCompanyId:', activeCompanyId);
  }
  
  const product: ProductCore = {
    id: productId,
    name: 'Premium Wireless Headphones',
    description: 'Experience premium sound quality with these state-of-the-art wireless headphones. Featuring advanced noise cancellation technology, 30-hour battery life, and comfortable over-ear design. Perfect for music lovers, professionals, and anyone who demands the best audio experience.',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=600&fit=crop',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=600&fit=crop',
    ],
    sku: isOwnerProduct ? 'WH-PRE-001' : undefined,
    barcode: isOwnerProduct ? '1234567890123' : undefined,
    brand: 'AudioPro',
    brandLogo: 'https://picsum.photos/seed/audiopro/100/100',
    category: 'Electronics',
    unit: '0.5L',
    unitQuantity: 10,
    supplier: isOwnerProduct ? 'TechCorp Industries' : undefined,
    isPublished: true,
  };

  const pricing: ProductPricing = {
    basePrice: 299.99,
    currency: DEFAULT_CURRENCY,
    costPrice: isOwnerProduct ? 180.00 : undefined,
    taxRate: isOwnerProduct ? 18 : undefined,
  };

  // Add original price for sale display
  (pricing as any).originalPrice = 399.99;

  const availability: ProductAvailability = {
    status: 'Available',
    stockQuantity: isOwnerProduct ? 25 : undefined,
    minStockAlert: 5,
    isLowStock: false,
    isOutOfStock: false,
    moq: 1,
  };

  // CRITICAL: For non-owner products, use a company ID that is GUARANTEED to be different
  // Use a fixed "other-company" ID to ensure it never matches the user's company
  const sellerCompanyId = isOwnerProduct ? (activeCompanyId || 'my-company') : 'other-company-xyz';
  
  const seller: SellerInfo = {
    companyId: sellerCompanyId,
    companyName: isOwnerProduct ? 'My Company' : 'TechCorp Industries',
    companyLogo: 'https://picsum.photos/seed/techcorp/100/100',
  };

  console.log('[createMockProduct] sellerCompanyId:', sellerCompanyId, 'activeCompanyId:', activeCompanyId);

  const viewerContext = computeViewerContext(seller.companyId, activeCompanyId);
  
  console.log('[createMockProduct] viewerContext.isOwner:', viewerContext.isOwner);
  
  if (viewerContext.buyerCapabilities) {
    viewerContext.buyerCapabilities = adjustBuyerCapabilitiesForAvailability(
      viewerContext.buyerCapabilities,
      availability
    );
  }

  return {
    product,
    pricing,
    availability,
    seller,
    viewerContext,
  };
}

function createMockSameBrandProducts(): RelatedProduct[] {
  return [
    { id: 'brand-1', name: 'AudioPro Earbuds Pro', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200', price: 149.99, currency: DEFAULT_CURRENCY, brand: 'AudioPro' },
    { id: 'brand-2', name: 'AudioPro Speaker Max', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=200', price: 199.99, currency: DEFAULT_CURRENCY, brand: 'AudioPro' },
    { id: 'brand-3', name: 'AudioPro Gaming Headset', image: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=200', price: 179.99, currency: DEFAULT_CURRENCY, brand: 'AudioPro' },
  ];
}

function createMockSameCompanyProducts(): RelatedProduct[] {
  return [
    { id: 'comp-1', name: 'Smart Watch Pro', image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200', price: 249.99, currency: DEFAULT_CURRENCY },
    { id: 'comp-2', name: 'Wireless Keyboard', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200', price: 89.99, currency: DEFAULT_CURRENCY },
    { id: 'comp-3', name: 'USB-C Hub', image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=200', price: 59.99, currency: DEFAULT_CURRENCY },
  ];
}

function createMockSameCategoryProducts(): RelatedProduct[] {
  return [
    { id: 'cat-1', name: 'Wireless Charger', image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=200', price: 49.99, currency: DEFAULT_CURRENCY },
    { id: 'cat-2', name: 'Phone Case Premium', image: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=200', price: 29.99, currency: DEFAULT_CURRENCY },
    { id: 'cat-3', name: 'Screen Protector HD', image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=200', price: 19.99, currency: DEFAULT_CURRENCY },
    { id: 'cat-4', name: 'Bluetooth Adapter 5.0', image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=200', price: 39.99, currency: DEFAULT_CURRENCY },
  ];
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
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
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.medium,
  },
  stickyControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    gap: 12,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 120,
  },
  carouselContainer: {
    position: 'relative',
  },
  carouselImage: {
    height: '100%',
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    gap: 8,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.bold,
    color: '#FFFFFF',
  },
  infoContainer: {
    padding: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
  },
  // Product Name - 24px semibold primary
  productName: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.semiBold,
    lineHeight: 30,
    marginBottom: 8,
  },
  // Unit Box - 16px medium secondary
  unitBox: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  unitText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  // Price Block
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  originalPriceContainer: {
    position: 'relative',
  },
  originalPrice: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  strikethrough: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
  },
  currentPrice: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.medium,
  },
  // Description - 14px medium primary, 2 lines
  descriptionSection: {
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    lineHeight: 20,
  },
  seeMoreText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 4,
  },
  // Owner Details Section
  ownerDetailsSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    flex: 1,
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  // Related Products Sections
  relatedSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  lastRelatedSection: {
    marginBottom: 16,
  },
  relatedTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 12,
  },
  relatedScrollContent: {
    gap: 12,
  },
  relatedCard: {
    width: 120,
  },
  relatedImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
  },
  relatedImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedName: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: 4,
  },
  relatedPrice: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 0.5,
  },
  // Owner Edit Button
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Buyer Order Button
  orderButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  orderButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Order Flow Container
  orderFlowContainer: {
    alignItems: 'center',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.semiBold,
    marginHorizontal: 24,
    minWidth: 40,
    textAlign: 'center',
  },
  totalAmount: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 16,
  },
  orderButtonsContainer: {
    width: '100%',
    gap: 0,
  },
  addToCartButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  addToCartButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  removeButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default ProductDetailScreen;
