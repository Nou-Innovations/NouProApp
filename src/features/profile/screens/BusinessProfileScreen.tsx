import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, Dimensions, StyleSheet, Linking, StatusBar, ScrollView, FlatList, Alert, Share,
} from 'react-native';
import { mockBusiness, mockBrands, mockBusinessAbout, getBusinessById, getBrandsByBusinessId, feedCompanies } from '@/shared/data/businessProfile';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import BrandCard from '@/features/brands/components/BrandCard';
import ProductCard from '@/features/products/components/ProductCard';
import ProductCardOtherCompany from '@/features/products/components/ProductCardOtherCompany';
import CartPopup from '@/features/cart/components/CartPopup';
import CartItemCard from '@/features/cart/components/CartItemCard';
import CartBottomSection from '@/features/cart/components/CartBottomSection';
import ProfileActionButtons from '@/features/profile/components/ProfileActionButtons';
import { useAppStore } from '@/shared/store';
import { useProfileStore } from '@/shared/store/profileStore';
import { useOrderStore } from '@/shared/store/orderStore';
import { useProfileViewType } from '@/shared/hooks/useProfileViewType';
import { ProfileViewType, getProfileAdditionalOptions } from '@/shared/types/profile';
import { useTheme } from '@/shared/theme/ThemeProvider';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = SCREEN_HEIGHT * (2 / 3); // 2/3 of screen height
const TAB_BAR_HEIGHT = 50;

// Base tabs without Cart (Cart only shown in Business Mode)
const BASE_TABS = [
  { key: 'products', label: 'Products', icon: 'cube-outline' },
  { key: 'about', label: 'About Us', icon: 'information-circle-outline' },
];

const CART_TAB = { key: 'cart', label: 'Cart', icon: 'cart-outline' };

// Helper to process products into brands (similar to ProductScreen)
const processProductsToBrands = (brands: any[]) => {
  return brands.map(brand => ({
    name: brand.name,
    logo: brand.imageUrl,
    productCount: brand.products.length,
    products: brand.products,
  }));
};

// Define list item types for FlatList data (similar to ProductScreen)
type ListItem = 
  | { type: 'brand'; data: any }
  | { type: 'product'; data: any };

export default function BusinessProfileScreen({ navigation, route }: { navigation: any, route: any }) {
  const insets = useSafeAreaInsets();
  const { theme: appTheme } = useTheme();
  
  // Get business ID and expand brand ID from route params
  const businessId = route.params?.businessId || mockBusiness.id;
  const expandBrandId = route.params?.expandBrandId;
  
  // Get dynamic business data based on businessId
  const business = useMemo(() => getBusinessById(businessId), [businessId]);
  const brands = useMemo(() => getBrandsByBusinessId(businessId), [businessId]);
  const aboutInfo = useMemo(() => {
    const company = feedCompanies[businessId];
    return {
      description: company?.description || mockBusinessAbout.description,
      website: company?.website || mockBusinessAbout.website,
      phone: business.locations?.[0]?.phone || mockBusinessAbout.phone,
      businessHours: company?.businessHours || mockBusinessAbout.businessHours,
      mapLocation: mockBusinessAbout.mapLocation,
    };
  }, [businessId, business]);

  // Find brand name to expand based on expandBrandId
  const initialExpandedBrand = useMemo(() => {
    if (expandBrandId) {
      const brand = brands.find((b: any) => b.id === expandBrandId);
      return brand?.name || null;
    }
    return null;
  }, [expandBrandId, brands]);

  const [activeTab, setActiveTab] = useState('products');
  const [expandedBrandName, setExpandedBrandName] = useState<string | null>(initialExpandedBrand);
  const [isCartPopupVisible, setIsCartPopupVisible] = useState(false);
  const [addingStates, setAddingStates] = useState<Record<string, { isAdding: boolean; quantity: number }>>({});
  
  // Update expanded brand when route params change
  useEffect(() => {
    if (expandBrandId) {
      const brand = brands.find((b: any) => b.id === expandBrandId);
      if (brand) {
        setExpandedBrandName(brand.name);
        setActiveTab('products');
      }
    }
  }, [expandBrandId, brands]);
  
  // Get profile mode to determine if Cart should be shown
  const isBusinessMode = useProfileStore((state) => state.activeMode === 'business');
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  
  // Determine profile view type - this is for viewing OTHER businesses
  const { viewType, isOwnProfile, canOrder, showAdditionalOptions } = useProfileViewType({
    profileId: businessId,
    profileType: 'business',
  });
  
  // Use the old store for compatibility (will be migrated to orderStore)
  const { cartItems, addToCart, removeFromCart } = useAppStore();
  
  // New order store for B2B ordering
  const { 
    getCart, 
    addToCart: addToOrderCart, 
    clearCart: clearOrderCart 
  } = useOrderStore();
  
  // Determine which tabs to show based on mode
  const TABS = useMemo(() => {
    if (isBusinessMode) {
      return [...BASE_TABS, CART_TAB];
    }
    return BASE_TABS;
  }, [isBusinessMode]);

  // Auto-hide cart popup when cart becomes empty
  useEffect(() => {
    if (cartItems.length === 0 && isCartPopupVisible) {
      setIsCartPopupVisible(false);
    }
  }, [cartItems.length, isCartPopupVisible]);

  // Backend logic: Check if business has products
  const hasProducts = useMemo(() => {
    return brands && brands.length > 0 && brands.some(brand => brand.products && brand.products.length > 0);
  }, [brands]);

  // Process brands for display (similar to ProductScreen)
  const displayBrands = useMemo(() => processProductsToBrands(brands), [brands]);

  // Create list data similar to ProductScreen
  const listData: ListItem[] = useMemo(() => {
    const data: ListItem[] = [];
    displayBrands.forEach(brand => {
      data.push({ type: 'brand', data: brand });
      if (brand.name === expandedBrandName) {
        brand.products.forEach((product: any) => {
          data.push({ type: 'product', data: product });
        });
      }
    });
    return data;
  }, [displayBrands, expandedBrandName]);

  // Handle Tab Press
  const handleTabPress = (tabKey: string) => {
    setActiveTab(tabKey);
    // Close cart popup when switching away from products tab
    if (tabKey !== 'products' && isCartPopupVisible) {
      setIsCartPopupVisible(false);
    }
  };

  // Handle brand expansion (similar to ProductScreen)
  const handleBrandPress = (brandName: string) => {
    setExpandedBrandName(prev => (prev === brandName ? null : brandName));
  };

  // Handle "Make an order" button - navigate to products tab
  const handleMakeOrder = () => {
    setActiveTab('products');
  };

  // Handle product added to cart
  const handleProductAddedToCart = (productId: string, quantity: number) => {
    console.log('Added to cart:', productId, 'Quantity:', quantity);
    // Show cart popup when an item is added (only if not already visible)
    if (!isCartPopupVisible) {
      setTimeout(() => {
        setIsCartPopupVisible(true);
      }, 300); // Small delay to ensure the cart is updated first
    }
  };

  // Handle cart popup close
  const handleCartPopupClose = () => {
    setIsCartPopupVisible(false);
  };

  // Handle Add to Cart button press (Continue order)
  const handleAddToCart = () => {
    setIsCartPopupVisible(false);
    // User wants to continue ordering - just close popup
  };

  // Handle Go to Cart button press
  const handleGoToCart = () => {
    setIsCartPopupVisible(false);
    // Navigate to cart tab
    setActiveTab('cart');
  };

  // Profile action handlers based on ProfileViewType (OTHER_BUSINESS)
  const handlePrimaryAction = () => {
    // Message business
    navigation.navigate('Chat', { 
      id: 'biz-1', 
      name: business.name, 
      avatar: business.logo,
      isGroup: false,
      partnerId: business.id,
      partnerType: 'business',
      unreadCount: 0,
    });
  };

  const handleSecondaryAction = () => {
    // Connect with business
    Alert.alert('Connect', `Connect with ${business.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Connect', onPress: () => console.log('Connecting with business') },
    ]);
  };

  const handleMoreOptions = () => {
    const options = getProfileAdditionalOptions(viewType);
    Alert.alert('Options', 'Select an action', [
      ...options.map((option) => ({
        text: option,
        onPress: () => console.log(`${option} pressed for business ${businessId}`),
        style: option === 'Block' ? 'destructive' as const : 'default' as const,
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${business.name} on NouPro!`,
        title: 'Share Business',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Adding state management functions
  const startAdding = (productId: string) => {
    setAddingStates(prev => ({
      ...prev,
      [productId]: { 
        isAdding: true, 
        quantity: prev[productId]?.quantity || 1 
      }
    }));
  };

  const changeQuantity = (productId: string, quantity: number) => {
    setAddingStates(prev => ({
      ...prev,
      [productId]: { 
        ...prev[productId],
        quantity: quantity 
      }
    }));
  };

  const cancelAdding = (productId: string) => {
    setAddingStates(prev => ({
      ...prev,
      [productId]: { 
        ...prev[productId],
        isAdding: false 
      }
    }));
  };

  const confirmAdd = (productId: string, product: any) => {
    const state = addingStates[productId];
    const quantity = state?.quantity || 1;
    
    // Add to cart
    addToCart(product, quantity);
    handleProductAddedToCart(productId, quantity);
    
    // Cancel adding state
    cancelAdding(productId);
  };

  // Render list item (similar to ProductScreen)
  const renderListItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'brand') {
      return (
        <BrandCard 
          brandName={item.data.name}
          brandLogo={item.data.logo}
          productCount={item.data.productCount}
          isExpanded={expandedBrandName === item.data.name}
          onPress={() => handleBrandPress(item.data.name)}
        />
      );
    } else {
      const addingState = addingStates[item.data.id] || { isAdding: false, quantity: 1 };
      return (
        <ProductCardOtherCompany 
          key={`product-${item.data.id}`}
          product={item.data}
          isAdding={addingState.isAdding}
          quantity={addingState.quantity}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.data.id })}
          onStartAdding={() => startAdding(item.data.id)}
          onChangeQuantity={(qty) => changeQuantity(item.data.id, qty)}
          onCancelAdding={() => cancelAdding(item.data.id)}
          onConfirmAdd={() => confirmAdd(item.data.id, item.data)}
        />
      );
    }
  };

  const keyExtractor = (item: ListItem) => {
    return item.type === 'brand' ? `brand-${item.data.name}` : `product-${item.data.id}`;
  };

  const AboutUsTab = () => (
    <View style={styles.tabContentContainer}>
      <View style={styles.detailsContainer}>
        <DetailItem icon="location-outline" text={business.locations?.[0]?.address || 'Address not available'} />
        <DetailItem icon="globe-outline" text={aboutInfo.website || 'website.com'} onPress={() => aboutInfo.website && Linking.openURL(`https://${aboutInfo.website}`)} isLink />
        <DetailItem icon="mail-outline" text={business.locations?.[0]?.email || 'contact@company.com'} onPress={() => Linking.openURL(`mailto:${business.locations?.[0]?.email || 'contact@company.com'}`)} isLink />
        <DetailItem icon="call-outline" text={aboutInfo.phone || 'Phone not available'} onPress={() => aboutInfo.phone && Linking.openURL(`tel:${aboutInfo.phone}`)} isLink />
      </View>
      
      <View style={styles.hoursContainer}>
        <Text style={styles.sectionTitle}>Business Hours</Text>
        {aboutInfo.businessHours.map((h, index) => (
          <View 
            key={h.day} 
            style={[styles.hourRow, index === aboutInfo.businessHours.length - 1 && styles.hourRowLast]}
          >
            <Text style={styles.hourDay}>{h.day}</Text>
            <Text style={styles.hourTime}>{h.open}{h.close && h.open !== 'Closed' ? ` - ${h.close}` : ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const ProductsTab = () => {
    // Backend logic: Show products if available, otherwise show "No product yet"
    if (!hasProducts) {
      return (
        <View style={[styles.tabContentContainer, styles.fixedHeightContainer, styles.centeredContainer]}>
          <Text style={styles.emptyStateText}>No product yet</Text>
        </View>
      );
    }

    // Display products using ScrollView with BrandCard and ProductCard components (exactly like ProductScreen)
    return (
      <View style={[styles.tabContentContainer, styles.fixedHeightContainer]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {listData.map((item) => {
            if (item.type === 'brand') {
              return (
                <BrandCard 
                  key={`brand-${item.data.name}`}
                  brandName={item.data.name}
                  brandLogo={item.data.logo}
                  productCount={item.data.productCount}
                  isExpanded={expandedBrandName === item.data.name}
                  onPress={() => handleBrandPress(item.data.name)}
                />
              );
            } else {
              return (
                <ProductCardOtherCompany 
                  key={`product-${item.data.id}`}
                  product={item.data}
                  isAdding={addingStates[item.data.id]?.isAdding || false}
                  quantity={addingStates[item.data.id]?.quantity || 1}
                  onPress={() => navigation.navigate('ProductDetail', { productId: item.data.id })}
                  onStartAdding={() => startAdding(item.data.id)}
                  onChangeQuantity={(qty) => changeQuantity(item.data.id, qty)}
                  onCancelAdding={() => cancelAdding(item.data.id)}
                  onConfirmAdd={() => confirmAdd(item.data.id, item.data)}
                />
              );
            }
          })}
          {listData.length === 0 && (
            <View style={styles.emptyListComponent}>
              <Text style={styles.emptyListText}>No brands or products found</Text>
            </View>
          )}
        </ScrollView>
    </View>
  );
  };

  const handlePlaceOrder = () => {
    if (!isBusinessMode || !activeBusiness) {
      Alert.alert('Error', 'You must be in Business Mode to place orders.');
      return;
    }
    
    const { placeOrder } = useOrderStore.getState();
    const order = placeOrder(
      activeBusiness.id,
      activeBusiness.name,
      business.id,
      business.name
    );
    
    if (order) {
      Alert.alert(
        'Order Placed!',
        `Your order #${order.id} has been sent to ${business.name}.`,
        [
          { text: 'View Order', onPress: () => navigation.navigate('OrderDetail', { orderId: order.id }) },
          { text: 'Continue', style: 'cancel' },
        ]
      );
    } else {
      // Fallback to old store behavior
      const { placeOrder: legacyPlaceOrder } = useAppStore.getState();
      legacyPlaceOrder(business.id, business.name);
      navigation.navigate('Inbox');
    }
  };

  const CartTab = () => {
    if (cartItems.length === 0) {
      return (
        <View style={[styles.tabContentContainer, styles.fixedHeightContainer, styles.centeredContainer]}> 
          <Icon name="cart-outline" size={60} color={appTheme.colors.textMuted} />
          <Text style={styles.emptyCartText}>Nothing in cart yet</Text>
          <TouchableOpacity style={styles.orderButton} onPress={handleMakeOrder}>
            <Text style={styles.orderButtonText}>Make an order</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.tabContentContainer, styles.fixedHeightContainer]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 180 }} // Space for bottom section
        >
          {cartItems.map((item) => (
            <CartItemCard
              key={item.productId}
              item={item}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  interface DetailItemProps {
    icon: keyof typeof Icon.glyphMap;
    text: string;
    onPress?: () => void;
    isLink?: boolean;
  }

  const DetailItem = ({ icon, text, onPress, isLink = false }: DetailItemProps) => (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={styles.detailItem}>
      <Icon name={icon} size={20} color={appTheme.colors.iconMuted} style={styles.detailIcon} />
      <Text style={[styles.detailText, isLink && styles.linkText]} numberOfLines={2}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + (isCartPopupVisible && cartItems.length > 0 ? 120 : 0)
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Image */}
        <View style={styles.coverImageContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' }}
          style={styles.coverPhoto}
          resizeMode="cover"
        />
        </View>

        {/* Profile Card - Product Detail Style */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardColumn}>
              <View style={styles.logoContainerTopLeft}>
                <Image
                  source={{ uri: business.logo }}
                  style={styles.profileLogoTopLeft}
                />
              </View>
              <View style={styles.profileInfoLeft}>
                <View style={styles.profileTextBlockLeft}>
                  <Text style={styles.businessNameLeft}>{business.name}</Text>
                  <Text style={styles.businessTypeLeft}>Distributor</Text>
                  <Text style={styles.businessDescriptionLeft} numberOfLines={2}>
                    {aboutInfo.description}
                  </Text>
                </View>
                {/* Profile Action Buttons - Based on ProfileViewType (OTHER_BUSINESS) */}
                <ProfileActionButtons
                  viewType={viewType}
                  onPrimaryPress={handlePrimaryAction}
                  onSecondaryPress={handleSecondaryAction}
                  onMoreOptionsPress={showAdditionalOptions ? handleMoreOptions : undefined}
                />
              </View>
            </View>
        </View>
 
        {/* Tab Bar */}
        <View style={styles.tabsContainer}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, activeTab === tab.key && styles.activeTabButton]}
                onPress={() => handleTabPress(tab.key)}
              >
                <Icon name={tab.icon as keyof typeof Icon.glyphMap} size={20} color={activeTab === tab.key ? appTheme.colors.text : appTheme.colors.iconMuted} />
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
        </View>
 
        {/* Tab Content */}
        <View style={styles.tabContentOuterContainer}>
          {activeTab === 'about' && <AboutUsTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'cart' && <CartTab />}
        </View>
      </ScrollView>

      {/* Fixed Header - Moved to bottom so it overlays everything */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Chat', { 
            id: 'biz-1', 
            name: business.name, 
            avatar: business.logo,
            isGroup: false,
            partnerId: business.id,
            partnerType: 'business',
            unreadCount: 0,
          })}
        >
          <Icon name="paper-plane-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Cart Popup - Fixed across all tabs */}
      <CartPopup
        isVisible={isCartPopupVisible && activeTab === 'products'}
        onClose={handleCartPopupClose}
        onAddToCart={handleAddToCart}
        onGoToCart={handleGoToCart}
      />

      {/* Cart Bottom Section - Only show on cart tab with items */}
      {activeTab === 'cart' && cartItems.length > 0 && (
        <CartBottomSection onPlaceOrder={handlePlaceOrder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  coverImageContainer: {
    height: COVER_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: '#fff',
    // Removed border radius and shadow for product detail style
  },
  profileCardColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start', 
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 15,
  },
  logoContainerTopLeft: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  profileLogoTopLeft: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
  },
  profileInfoLeft: {
    width: '100%',
    alignItems: 'flex-start',
  },
  profileTextBlockLeft: {
    marginBottom: 10,
    width: '100%',
  },
  businessNameLeft: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  businessTypeLeft: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  businessDescriptionLeft: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 17,
  },
  actionButtonsFill: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 15,
    gap: 10,
  },
  messageButtonFill: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  connectButtonFill: {
    flex: 1,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTextWhite: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  moreButtonAction: {
    height: 40,
    width: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    width: '100%',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
  },
  activeTabButton: {
    borderBottomColor: '#1f2937',
  },
  tabLabel: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6b7280',
  },
  activeTabLabel: {
    color: '#1f2937',
    fontWeight: '600',
  },
  tabContentOuterContainer: {
    flex: 1,
  },
  tabContentContainer: {
  },
  fixedHeightContainer: {
    minHeight: 400,
  },
  centeredContainer: {
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#9ca3af',
    marginTop: 80,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  hourRowLast: {
    borderBottomWidth: 0,
  },
  hourDay: {
    fontSize: 14,
    color: '#374151',
  },
  hourTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailText: {
    flex: 1,
    color: '#374151',
    fontSize: 15,
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  hoursContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyCartText: {
    color: '#9ca3af',
    marginTop: 15,
  },
  orderButton: {
    marginTop: 24,
    backgroundColor: '#000',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  emptyListComponent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListText: {
    color: '#9ca3af',
    marginTop: 40,
  },

}); 