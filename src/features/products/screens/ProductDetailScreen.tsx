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
 *    - Shows related products sections (More from distributor / brand / category)
 *
 * Layout: a parallax hero image with a swipeable thumbnail strip; the info sheet
 * scrolls up and over the pinned image. See src/features/products/components/productDetail/.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { Icon } from '@/shared/utils/icons';
import { AppButton, TextButton, AppBottomSheet } from '@/shared/components/ui';
import type { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsPersonalMode, useIsBusinessMode, useProfileStore } from '@/shared/store/profileStore';
import { useOrderStore } from '@/shared/store/orderStore';
import { get as apiGet } from '@/shared/services/api';
import {
  ProductDetailsDTO,
  ProductCore,
  ProductPricing,
  ProductAvailability,
  SellerInfo,
  computeViewerContext,
  adjustBuyerCapabilitiesForAvailability,
  resolveViewerMode,
  formatPrice,
  DEFAULT_CURRENCY,
  RelatedProduct,
} from '@/shared/types/productDetails';
import { getSuppliersForProduct, type ProductSupplierPricing } from '@/features/procurement/services/procurement.service';
import { toggleProductListed, carryProduct, reportProduct, type ProductReportReason } from '@/features/products/products.service';
import SupplierPickerModal from '@/features/procurement/components/SupplierPickerModal';
import type { Supplier } from '@/shared/types/procurement';
import ProductHero from '../components/productDetail/ProductHero';
import PriceBlock from '../components/productDetail/PriceBlock';
import SellerCard from '../components/productDetail/SellerCard';
import OwnerDetailRows from '../components/productDetail/OwnerDetailRows';
import ClientStoreCard from '../components/productDetail/ClientStoreCard';
import RelatedRow from '../components/productDetail/RelatedRow';
import { HeroHeader } from '@/shared/components/layout/headers';
import ProductDetailSkeleton, { RelatedRowSkeleton } from '../components/productDetail/ProductDetailSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Image must be 3:4 ratio (width:height = 3:4)
const IMAGE_HEIGHT = SCREEN_WIDTH * (4 / 3);

// Parallax-sheet layout: the hero drifts at PARALLAX_FACTOR while the info sheet
// (which paints on top) scrolls up and covers it. The solid header bar fades in
// between HEADER_FADE_START and HEADER_FADE_END of scroll.
const SHEET_OVERLAP = 24;
const PARALLAX_FACTOR = 0.5;
// HeroHeader derives the title-bar fade range from heroHeight (0.45 → 0.78); this
// constant is kept only to decide when the status bar flips to its solid style.
const HEADER_FADE_END = IMAGE_HEIGHT * 0.78;

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
    brandId: apiProduct.brand_id ?? apiProduct.brandId ?? undefined,
    brandLogo: apiProduct.brandLogo,
    category: apiProduct.category,
    tags: apiProduct.tags,
    unit: apiProduct.unit,
    unitQuantity: apiProduct.unitQuantity || apiProduct.packSize,
    supplier: apiProduct.supplier || apiProduct.supplierName,
    variants: apiProduct.variants,
    isPublished: apiProduct.is_listed ?? apiProduct.isPublished ?? true,
    isArchived: apiProduct.isArchived ?? false,
    hasCarton: apiProduct.hasCarton ?? false,
    hasRetailPriceLimit: apiProduct.hasRetailPriceLimit ?? false,
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
    // Carton pricing
    pricePerCarton: apiProduct.pricePerCarton,
    unitsPerCarton: apiProduct.unitsPerCarton,
    // Retail price limit (owner only)
    retailPriceLimit: apiProduct.retailPriceLimit,
    // Price privacy
    priceHidden: apiProduct.priceHidden ?? false,
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
  const sellerCompanyId =
    apiProduct.ownerBusinessId ||
    apiProduct.companyId ||
    apiProduct.business_id ||
    apiProduct.businessId ||
    apiProduct.distributorId ||
    '';

  const seller: SellerInfo = {
    companyId: sellerCompanyId,
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

  // Viewer's own stock relationship (client who already carries this product).
  // Backend supplies `viewerStock` (follow-up); absent → treated as a first-time buyer.
  const viewerStock = apiProduct.viewerStock
    ? {
        alreadyStocked: !!apiProduct.viewerStock.alreadyStocked,
        stockQuantity: apiProduct.viewerStock.stockQuantity,
        lastOrderedAt: apiProduct.viewerStock.lastOrderedAt,
        totalOrdered: apiProduct.viewerStock.totalOrdered,
        isListed: apiProduct.viewerStock.isListed,
        clientProductId: apiProduct.viewerStock.clientProductId,
      }
    : undefined;

  return {
    product,
    pricing,
    availability,
    seller,
    viewerContext,
    viewerStock,
  };
}

// ============================================================================
// Main Component
// ============================================================================

const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { productId } = route.params;
  const { theme: appTheme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeBusiness } = useProfileStore();
  const activeCompanyId = activeBusiness?.id || null;
  const { addToCart } = useOrderStore();

  // App mode detection
  const isPersonalMode = useIsPersonalMode();
  const isBusinessMode = useIsBusinessMode();

  // State
  const [dto, setDto] = useState<ProductDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  // Related "More from…" sections load after the main product — kept as skeletons
  // until their fetch resolves so they don't pop into empty space.
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  // Order flow state (buyer mode)
  const [isOrdering, setIsOrdering] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Related products (buyer mode only)
  const [sameBrandProducts, setSameBrandProducts] = useState<RelatedProduct[]>([]);
  const [sameCompanyProducts, setSameCompanyProducts] = useState<RelatedProduct[]>([]);
  const [sameCategoryProducts, setSameCategoryProducts] = useState<RelatedProduct[]>([]);

  // Supplier pricing (owner mode - for reorder)
  const [supplierPricingData, setSupplierPricingData] = useState<ProductSupplierPricing[]>([]);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);

  const scrollViewRef = useRef<any>(null);
  const imageScrollRef = useRef<ScrollView>(null);

  // ---- Parallax-sheet animation ----
  const scrollY = useSharedValue(0);
  const [headerSolid, setHeaderSolid] = useState(false);
  const updateHeaderSolid = useCallback((v: boolean) => {
    setHeaderSolid((prev) => (prev === v ? prev : v));
  }, []);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      runOnJS(updateHeaderSolid)(event.contentOffset.y > HEADER_FADE_END);
    },
  });
  const heroAnimatedStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    // Drift the hero up at PARALLAX_FACTOR (translate down to slow it vs the 1:1 scroll).
    const translateY = interpolate(y, [0, IMAGE_HEIGHT], [0, IMAGE_HEIGHT * PARALLAX_FACTOR], Extrapolation.CLAMP);
    // Zoom slightly on pull-down so the top never reveals a gap during the bounce.
    const scale = y < 0 ? 1 + (-y / IMAGE_HEIGHT) * 1.6 : 1;
    return { transform: [{ translateY }, { scale }] };
  });
  // Fetch supplier pricing for owner's products
  useEffect(() => {
    if (dto?.viewerContext.isOwner && activeCompanyId && productId) {
      getSuppliersForProduct(activeCompanyId, productId)
        .then(setSupplierPricingData)
        .catch(() => setSupplierPricingData([]));
    }
  }, [dto?.viewerContext.isOwner, activeCompanyId, productId]);

  const mapToRelatedProduct = (p: any): RelatedProduct => ({
    id: p.id,
    name: p.name,
    image: p.productPicture || p.image_url,
    price: p.priceHidden ? 0 : (p.price || 0),
    currency: DEFAULT_CURRENCY,
    brand: p.brand,
    priceHidden: p.priceHidden ?? false,
  });

  const fetchRelatedProducts = async (productDTO: ProductDetailsDTO) => {
    const { product: prod, seller: sel } = productDTO;
    try {
      const viewerBizId = activeCompanyId || undefined;

      // Same brand products (exclude current)
      if (prod.brand) {
        const brandProducts = await apiGet<any[]>('/products', { scope: 'public', brand: prod.brand, viewerBusinessId: viewerBizId });
        setSameBrandProducts(
          (brandProducts || []).filter(p => p.id !== productId).slice(0, 4).map(mapToRelatedProduct)
        );
      }

      // Same company products
      if (sel.companyId) {
        const companyProducts = await apiGet<any[]>('/products', { scope: 'public', companyId: sel.companyId, viewerBusinessId: viewerBizId });
        setSameCompanyProducts(
          (companyProducts || []).filter(p => p.id !== productId).slice(0, 4).map(mapToRelatedProduct)
        );
      }

      // Same category products
      if (prod.category) {
        const categoryProducts = await apiGet<any[]>('/products', { scope: 'public', category: prod.category, viewerBusinessId: viewerBizId });
        setSameCategoryProducts(
          (categoryProducts || []).filter(p => p.id !== productId).slice(0, 4).map(mapToRelatedProduct)
        );
      }
    } catch (err) {
      console.warn('[ProductDetail] Failed to fetch related products:', err);
      // Non-critical – just leave related sections empty
    } finally {
      setRelatedLoading(false);
    }
  };

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setRelatedLoading(true);
    setError(null);

    try {
      // Use company-scoped endpoint when we have an active business (enriches with stock data)
      // Fall back to public endpoint for personal mode / external products
      let productData: any;
      const viewerBizParam = activeCompanyId ? { viewerBusinessId: activeCompanyId } : {};
      if (activeCompanyId) {
        try {
          productData = await apiGet<any>(`/companies/${activeCompanyId}/products/${productId}`);
        } catch {
          // Product may not belong to this company — fall back to public endpoint with viewer context
          productData = await apiGet<any>(`/products/${productId}`, viewerBizParam);
        }
      } else {
        productData = await apiGet<any>(`/products/${productId}`, viewerBizParam);
      }

      if (productData) {
        const productDTO = transformToDTO(productData, activeCompanyId);
        setDto(productDTO);

        // Set initial quantity to MOQ if specified
        if (productDTO.availability.moq && productDTO.availability.moq > 1) {
          setQuantity(productDTO.availability.moq);
        }

        // Fetch related products for buyer mode
        if (!productDTO.viewerContext.isOwner) {
          fetchRelatedProducts(productDTO);
        }
      } else {
        throw new Error('Product not found');
      }
    } catch (err) {
      console.error('Error fetching product:', err);

      // Use mock data in dev mode
      if (__DEV__) {
        const mockProduct = createMockProduct(productId, activeCompanyId);

          setDto(mockProduct);

        // Always load related products - display logic handles when to show them
        fetchRelatedProducts(mockProduct);
      } else {
        setError('Failed to load product');
      }
    } finally {
      setLoading(false);
    }
  }, [productId, activeCompanyId]);

  // Fetch product data on mount / when the product changes
  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Image carousel scroll handler
  const handleImageScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.round(contentOffset.x / viewSize.width);
    setCurrentImageIndex(pageNum);
  };

  // Thumbnail tapped → jump the carousel to that image
  const handleThumbPress = (index: number) => {
    imageScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentImageIndex(index);
  };

  // Actions
  const handleShare = async () => {
    if (!dto) return;

    try {
      const priceText = dto.pricing.priceHidden ? '' : ` - ${formatPrice(dto.pricing.basePrice, dto.pricing.currency)}`;
      await Share.share({
        message: `Check out ${dto.product.name}${priceText}`,
        url: `https://noupro.com/products/${productId}`,
      });
    } catch {
      // Share cancelled or failed
    }
  };

  // Options menu (⋯ beside the name): Share + Edit for the owner, Share + Report otherwise.
  const handleMenuSelect = (item: AppBottomSheetItem) => {
    if (item.id === 'share') handleShare();
    else if (item.id === 'edit') handleEdit();
    else if (item.id === 'report') {
      // The menu sheet closes itself on select; open the reason picker once its
      // close animation finishes (two Modals can't be presented at once).
      setTimeout(() => setReportSheetVisible(true), 350);
    }
  };

  // A report reason was chosen — submit it and acknowledge.
  const handleReportReason = async (item: AppBottomSheetItem) => {
    try {
      await reportProduct(productId, item.id as ProductReportReason, undefined, activeCompanyId || undefined);
      Alert.alert('Report received', 'Thanks for flagging this. Our team will review it.', [{ text: 'OK' }]);
    } catch {
      Alert.alert('Could not report', 'Something went wrong. Please try again.');
    }
  };

  const handleBusinessPress = () => {
    if (dto?.seller.companyId) {
      navigation.navigate('ViewBusinessProfile', { businessId: dto.seller.companyId });
    }
  };

  // "More from {brand}" → distributor profile with that brand's section expanded.
  // Falls back to the company's products tab when no brandId is available.
  const handleBrandPress = () => {
    if (!dto?.seller.companyId) return;
    navigation.navigate('ViewBusinessProfile', {
      businessId: dto.seller.companyId,
      expandBrandId: dto.product.brandId,
    });
  };

  // Client-stocked: toggle whether this product is listed in the viewer's OWN store.
  // Acts on the client's own product copy (viewerStock.clientProductId).
  const handleToggleListing = async (next: boolean) => {
    const clientProductId = dto?.viewerStock?.clientProductId;
    if (!activeCompanyId || !clientProductId) return;
    try {
      await toggleProductListed(activeCompanyId, clientProductId, next);
    } catch {
      Alert.alert('Could not update', 'Failed to update your store listing. Please try again.');
    }
  };

  // Client-stocked: add this distributor's product to the viewer's own store
  // (creates a linked copy), then refetch so the stock + listing controls appear.
  const handleAddToStore = async () => {
    if (!activeCompanyId || !dto) return;
    try {
      await carryProduct(activeCompanyId, dto.product.id);
      fetchProduct();
    } catch {
      Alert.alert('Could not add', 'Failed to add this product to your store. Please try again.');
    }
  };

  // Owner action - Navigate to CreateProduct screen with product data for editing
  const handleEdit = () => {
    if (!dto) {
      Alert.alert('Edit Product', 'Product details not loaded yet.');
      return;
    }
    // Flatten the DTO into the shape CreateProductScreen expects
    const editData = {
      ...dto.product,
      price: dto.pricing.basePrice,
      costPrice: dto.pricing.costPrice,
      salePrice: dto.pricing.promo?.price,
      taxRate: dto.pricing.taxRate,
      stockQuantity: dto.availability.stockQuantity,
      status: dto.availability.status,
      image_url: dto.product.images?.[0],
      images: dto.product.images,
      is_listed: dto.product.isPublished,
      // Carton pricing
      hasCarton: dto.product.hasCarton,
      unitsPerCarton: dto.pricing.unitsPerCarton,
      pricePerCarton: dto.pricing.pricePerCarton,
      // Retail price limit
      hasRetailPriceLimit: dto.product.hasRetailPriceLimit,
      retailPriceLimit: dto.pricing.retailPriceLimit,
    };
    navigation.navigate('CreateProduct' as never, { product: editData } as never);
  };

  // Owner action - Reorder from supplier
  const handleReorder = () => {
    if (supplierPricingData.length === 0) {
      Alert.alert(
        'No Suppliers Linked',
        'This product has no linked suppliers. Add a supplier first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Suppliers', onPress: () => (navigation as any).navigate('Suppliers') },
        ]
      );
      return;
    }

    if (supplierPricingData.length === 1) {
      // Single supplier — go directly to CreatePurchaseOrder
      const sp = supplierPricingData[0];
      (navigation as any).navigate('CreatePurchaseOrder', {
        supplierId: sp.supplierId,
        supplierName: sp.supplierName,
        productId,
      });
    } else {
      // Multiple suppliers — show picker
      setShowSupplierPicker(true);
    }
  };

  const handleSupplierPickForReorder = (supplier: Supplier) => {
    setShowSupplierPicker(false);
    (navigation as any).navigate('CreatePurchaseOrder', {
      supplierId: supplier.id,
      supplierName: supplier.name,
      productId,
    });
  };

  // Buyer actions
  const handleOrderPress = () => {
    setIsOrdering(true);
    setQuantity(dto?.availability.moq || 1);
  };

  const handleAddToCart = () => {
    if (!dto) return;
    addToCart(
      dto.seller.companyId,
      dto.seller.companyName,
      {
        id: dto.product.id,
        name: dto.product.name,
        price: dto.pricing.basePrice,
        imageUrl: dto.product.images[0],
        unit: dto.product.unit,
      },
      quantity
    );
    Alert.alert('Added to Cart', `${quantity} x ${dto.product.name} added to cart`, [
      { text: 'Continue shopping', style: 'cancel' },
      {
        text: 'View Cart',
        onPress: () =>
          (navigation as any).navigate('Cart', {
            businessId: dto.seller.companyId,
            businessName: dto.seller.companyName,
          }),
      },
    ]);
    setIsOrdering(false);
    setQuantity(1);
  };

  const handleRemove = () => {
    setIsOrdering(false);
    setQuantity(1);
  };

  const handleQuantityChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    const maxQty = dto?.availability.maxOrderQuantity || 99;
    if (digits === '') {
      setQuantity(1);
      return;
    }
    let n = parseInt(digits, 10);
    if (n < 1) n = 1;
    if (n > maxQty) n = maxQty;
    setQuantity(n);
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

  // Loading state — full skeleton of the whole screen (no bare spinner)
  if (loading) {
    return <ProductDetailSkeleton onBack={() => navigation.goBack()} />;
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
          <AppButton title="Retry" onPress={fetchProduct} style={styles.retryButton} />
          <TextButton title="Go Back" onPress={() => navigation.goBack()} style={styles.backButton} />
        </View>
      </SafeAreaView>
    );
  }

  const { product, pricing, availability, seller } = dto;
  const images = product.images.length > 0 ? product.images : [''];
  const unitDisplay = formatUnitDisplay(product.unit, product.unitQuantity);
  const totalPrice = pricing.basePrice * quantity;

  // FOUR-MODE LOGIC (see resolveViewerMode): distributor (owner) / client-stocked
  // (already carries it) / client-new (first-time buyer) / personal (browse only).
  const viewerMode = resolveViewerMode(dto, { isBusinessMode, isPersonalMode });
  const isProductOwner = viewerMode === 'distributor';
  const isClientStocked = viewerMode === 'client-stocked';
  const canOrder = viewerMode === 'client-stocked' || viewerMode === 'client-new';
  const showRelatedProducts = isPersonalMode || canOrder; // Personal & both client modes
  const showOwnerDetails = isProductOwner;
  const showActionBar = isBusinessMode;
  const showSellerCard = showRelatedProducts && !!seller.companyName;
  const hasCartonInfo = !!(product.hasCarton && pricing.unitsPerCarton && !pricing.priceHidden);
  // Options menu (⋯ beside the name): owner gets Edit; everyone else gets Report.
  const menuItems: AppBottomSheetItem[] = [
    { id: 'share', title: 'Share' },
    isProductOwner
      ? { id: 'edit', title: 'Edit' }
      : { id: 'report', title: 'Report' },
  ];
  const reportReasons: AppBottomSheetItem[] = [
    { id: 'inappropriate', title: 'Inappropriate content' },
    { id: 'counterfeit', title: 'Counterfeit or fake' },
    { id: 'wrong_info', title: 'Incorrect information' },
    { id: 'spam', title: 'Spam or misleading' },
    { id: 'other', title: 'Other' },
  ];
  const statusBarStyle = isDarkMode ? 'light' : headerSolid ? 'dark' : 'light';

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <StatusBar style={statusBarStyle} animated />

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: showActionBar ? 140 : 48 }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Parallax hero — drifts slowly while the info sheet scrolls over it */}
        <Animated.View style={[styles.heroWrap, heroAnimatedStyle]}>
          <ProductHero
            images={images}
            heroHeight={IMAGE_HEIGHT}
            screenWidth={SCREEN_WIDTH}
            sheetOverlap={SHEET_OVERLAP}
            topInset={insets.top}
            currentImageIndex={currentImageIndex}
            imageScrollRef={imageScrollRef}
            onImageScroll={handleImageScroll}
            onThumbPress={handleThumbPress}
            availability={availability}
          />
        </Animated.View>

        {/* Info sheet (scrolls up over the hero) */}
        <View style={[styles.sheet, { backgroundColor: appTheme.colors.cardBackground }]}>
          <View style={[styles.grabber, { backgroundColor: appTheme.colors.borderColor }]} />

          {/* Brand row */}
          {!!product.brand && (
            <TouchableOpacity
              style={styles.brandRow}
              activeOpacity={0.6}
              disabled={!showRelatedProducts}
              onPress={handleBrandPress}
            >
              {!!product.brandLogo && (
                <Image source={{ uri: product.brandLogo }} style={styles.brandLogo} />
              )}
              <Text style={[styles.brandName, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
                {product.brand}
              </Text>
              {showRelatedProducts && (
                <Icon name="chevron-forward" size={14} color={appTheme.colors.textMuted} />
              )}
            </TouchableOpacity>
          )}

          {/* Product name + options (⋯) menu */}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: appTheme.colors.text }]}>{product.name}</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="More options"
            >
              <Icon name="ellipsis-horizontal" size={22} color={appTheme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Price */}
          <PriceBlock pricing={pricing} />

          {/* Unit + carton chips */}
          {(!!unitDisplay || hasCartonInfo) && (
            <View style={styles.chipsRow}>
              {!!unitDisplay && (
                <View style={[styles.chip, { backgroundColor: appTheme.colors.surface }]}>
                  <Text style={[styles.chipText, { color: appTheme.colors.textSecondary }]}>{unitDisplay}</Text>
                </View>
              )}
              {hasCartonInfo && (
                <View style={[styles.chip, { backgroundColor: appTheme.colors.surface }]}>
                  <Text style={[styles.chipText, { color: appTheme.colors.textSecondary }]}>
                    {pricing.unitsPerCarton} / carton
                    {pricing.pricePerCarton ? ` · ${formatPrice(pricing.pricePerCarton, pricing.currency)}` : ''}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Availability (non-owner views) */}
          {!showOwnerDetails && (
            <View style={[styles.availabilityPill, { backgroundColor: appTheme.colors.surface }]}>
              <View
                style={[
                  styles.availabilityDot,
                  { backgroundColor: availability.isOutOfStock ? appTheme.colors.error : appTheme.colors.success },
                ]}
              />
              <Text
                style={[
                  styles.availabilityText,
                  { color: availability.isOutOfStock ? appTheme.colors.error : appTheme.colors.text },
                ]}
              >
                {availability.isOutOfStock ? 'Out of stock' : 'In stock'}
              </Text>
            </View>
          )}

          {/* Description */}
          {!!product.description && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.description}
              onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            >
              <Text
                style={[styles.descriptionText, { color: appTheme.colors.textSecondary }]}
                numberOfLines={isDescriptionExpanded ? undefined : 3}
              >
                {product.description}
              </Text>
              {product.description.length > 120 && (
                <Text style={[styles.readMore, { color: appTheme.colors.accent }]}>
                  {isDescriptionExpanded ? 'Read less' : 'Read more'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Your-store panel (client who already stocks this product) */}
          {isClientStocked && (
            <ClientStoreCard
              stockQuantity={dto.viewerStock?.stockQuantity}
              isLowStock={
                dto.viewerStock?.stockQuantity != null &&
                dto.viewerStock.stockQuantity <= (availability.minStockAlert ?? 5) &&
                dto.viewerStock.stockQuantity > 0
              }
              lastOrderedAt={dto.viewerStock?.lastOrderedAt}
              totalOrdered={dto.viewerStock?.totalOrdered}
              isListed={dto.viewerStock?.isListed}
              canManage={!!dto.viewerStock?.clientProductId}
              onToggleListing={handleToggleListing}
              onAddToStore={handleAddToStore}
            />
          )}

          {/* Distributor card (buyer + personal) */}
          {showSellerCard && <SellerCard seller={seller} onPress={handleBusinessPress} />}

          {/* Owner details (owner) */}
          {showOwnerDetails && (
            <OwnerDetailRows
              product={product}
              pricing={pricing}
              availability={availability}
              supplierPricing={supplierPricingData}
            />
          )}

          {/* More sections (buyer + personal). Stay skeletons until loaded so
              they don't pop into empty space one by one. */}
          {showRelatedProducts && (
            relatedLoading ? (
              <>
                <RelatedRowSkeleton />
                <RelatedRowSkeleton isLast />
              </>
            ) : (
              <>
                <RelatedRow
                  title={`More from ${seller.companyName}`}
                  products={sameCompanyProducts}
                  onProductPress={handleRelatedProductPress}
                  onHeaderPress={handleBusinessPress}
                />
                <RelatedRow
                  title={`More from ${product.brand}`}
                  products={sameBrandProducts}
                  onProductPress={handleRelatedProductPress}
                  onHeaderPress={handleBrandPress}
                />
                <RelatedRow
                  title="You might also like"
                  products={sameCategoryProducts}
                  onProductPress={handleRelatedProductPress}
                  isLast
                />
              </>
            )
          )}
        </View>
      </Animated.ScrollView>

      {/* Hero header — controls always visible; solid bar + title fade in on scroll */}
      <HeroHeader
        title={product.name}
        scrollY={scrollY}
        heroHeight={IMAGE_HEIGHT}
        leftAction={{ icon: 'arrow-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }}
      />

      {/* Bottom Action Bar - BUSINESS MODE ONLY (Personal mode = browse only) */}
      {showActionBar && (
        <View style={[styles.bottomBar, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }, isOrdering && styles.bottomBarOrdering]}>
          {isProductOwner ? (
            /* Business Owner Mode: Edit + Reorder buttons */
            <View style={styles.ownerButtonsRow}>
              <AppButton
                title="Edit"
                onPress={handleEdit}
                variant="primary"
                iconLeft="create-outline"
                style={(availability.isLowStock || availability.isOutOfStock) ? styles.flexButton : undefined}
              />
              {(availability.isLowStock || availability.isOutOfStock) && (
                <AppButton
                  title="Reorder"
                  onPress={handleReorder}
                  variant="accent"
                  iconLeft="refresh"
                  style={styles.flexButton}
                />
              )}
            </View>
          ) : isOrdering ? (
            /* Business Buyer Mode: Order flow expanded */
            <View style={styles.orderFlowContainer}>
              {/* Quantity field */}
              <View style={[styles.qtyField, { borderColor: appTheme.colors.borderColor }]}>
                <Text style={[styles.qtyLabel, { color: appTheme.colors.textSecondary }]}>Quantity</Text>
                <TextInput
                  style={[styles.qtyInput, { color: appTheme.colors.text }]}
                  value={String(quantity)}
                  onChangeText={handleQuantityChange}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  returnKeyType="done"
                />
              </View>

              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: appTheme.colors.textSecondary }]}>Total</Text>
                <Text style={[styles.totalValue, { color: appTheme.colors.text }]}>
                  {formatPrice(totalPrice, pricing.currency)}
                </Text>
              </View>

              {/* Add to cart + Remove */}
              <View style={styles.orderButtonsContainer}>
                <AppButton
                  title="Add to cart"
                  onPress={handleAddToCart}
                  variant="primary"
                  fullWidth
                />
                <AppButton
                  title="Remove"
                  onPress={handleRemove}
                  variant="secondary"
                  fullWidth
                />
              </View>
            </View>
          ) : (
            /* Business Buyer Mode: primary Order / Reorder button */
            <AppButton
              title={availability.isOutOfStock ? 'Out of Stock' : isClientStocked ? 'Reorder' : 'Order'}
              variant="primary"
              onPress={handleOrderPress}
              disabled={availability.isOutOfStock}
            />
          )}
        </View>
      )}

      {/* Supplier Picker Modal for Reorder (when multiple suppliers) */}
      <SupplierPickerModal
        visible={showSupplierPicker}
        onClose={() => setShowSupplierPicker(false)}
        onSelect={handleSupplierPickForReorder}
        suppliers={supplierPricingData.map((sp) => ({
          id: sp.supplierId,
          name: sp.supplierName,
          contactName: sp.contactName,
          email: sp.email,
          phone: sp.phone,
        })) as Supplier[]}
      />

      {/* Options menu (⋯ beside the product name) */}
      <AppBottomSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={product.name}
        items={menuItems}
        onSelectItem={handleMenuSelect}
      />

      {/* Report reason picker */}
      <AppBottomSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        title="Report product"
        items={reportReasons}
        onSelectItem={handleReportReason}
      />
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
  // - 'stk-xxx' = Feed product this client ALREADY stocks → CLIENT-STOCKED MODE
  // - Everything else = Assume feed/other company → BUYER MODE (client-new)
  const isOwnerProduct = productId.startsWith('PRD-') || productId.startsWith('own-');
  const isStockedClient = productId.startsWith('stk-');

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
    brandId: 'brand-audiopro',
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
    location: isOwnerProduct ? undefined : 'Port Louis',
    isVerified: !isOwnerProduct,
    rating: isOwnerProduct ? undefined : 4.7,
    responseTime: isOwnerProduct ? undefined : 'Replies within 1h',
  };

  const viewerContext = computeViewerContext(seller.companyId, activeCompanyId);

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
    viewerStock: isStockedClient
      ? {
          alreadyStocked: true,
          stockQuantity: 8,
          lastOrderedAt: '2026-06-12T10:00:00.000Z',
          totalOrdered: 24,
          isListed: true,
          clientProductId: 'stk-client-copy',
        }
      : undefined,
  };
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
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
  },
  backButton: {
    marginTop: 12,
    alignSelf: 'center',
  },

  // Hero + sheet
  heroWrap: {
    zIndex: 0,
  },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    zIndex: 1,
    minHeight: 400,
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

  // Brand row
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  brandLogo: {
    width: 18,
    height: 18,
    borderRadius: 5,
  },
  brandName: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Name
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  name: {
    flex: 1,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: theme.fonts.primary.semiBold,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },

  // Availability
  availabilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 16,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },

  // Description
  description: {
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: theme.fonts.primary.regular,
  },
  readMore: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 6,
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomBarOrdering: {
    paddingBottom: 24,
  },
  ownerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexButton: {
    flex: 1,
  },
  orderFlowContainer: {
    alignItems: 'center',
  },
  qtyField: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 12,
  },
  qtyLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  qtyInput: {
    minWidth: 60,
    textAlign: 'right',
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    paddingVertical: 0,
  },
  totalRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  totalValue: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  orderButtonsContainer: {
    width: '100%',
    gap: 8,
  },
});

export default ProductDetailScreen;
