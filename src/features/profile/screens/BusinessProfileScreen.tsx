import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, Dimensions, StyleSheet, Linking, StatusBar, ScrollView, Alert, Share,
} from 'react-native';
import { mockBusiness, mockBrands, mockBusinessAbout, getBusinessById, getBrandsByBusinessId, feedCompanies } from '@/shared/data/businessProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import BrandCard from '@/features/brands/components/BrandCard';
import ProductCardOtherCompany from '@/features/products/components/ProductCardOtherCompany';
import CartPopup from '@/features/cart/components/CartPopup';
import CartItemCard from '@/features/cart/components/CartItemCard';
import CartBottomSection from '@/features/cart/components/CartBottomSection';
import ProfileActionButtons from '@/features/profile/components/ProfileActionButtons';
import Avatar from '@/shared/components/ui/Avatar';
import { useAppStore } from '@/shared/store';
import { useProfileStore } from '@/shared/store/profileStore';
import { useOrderStore } from '@/shared/store/orderStore';
import { useProfileViewType } from '@/shared/hooks/useProfileViewType';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import MapView, { Marker } from 'react-native-maps';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = SCREEN_WIDTH * (4 / 3); // 3:4 aspect ratio - matching BusinessProfileOwnScreen
const TAB_BAR_HEIGHT = 50;

// Mock business hours data - matching BusinessProfileOwnScreen
const mockBusinessHours = [
  { day: 'Monday', open: '09:00 AM', close: '06:00 PM' },
  { day: 'Tuesday', open: '09:00 AM', close: '06:00 PM' },
  { day: 'Wednesday', open: '09:00 AM', close: '06:00 PM' },
  { day: 'Thursday', open: '09:00 AM', close: '06:00 PM' },
  { day: 'Friday', open: '09:00 AM', close: '06:00 PM' },
  { day: 'Saturday', open: 'Closed', close: '' },
  { day: 'Sunday', open: 'Closed', close: '' },
];

// Mock map location
const mockMapLocation = {
  latitude: -20.232,
  longitude: 57.498,
};

// Base tabs without Cart (Cart only shown in Business Mode)
const BASE_TABS = [
  { key: 'products', label: 'Products', icon: 'cube-outline' },
  { key: 'about', label: 'About Us', icon: 'person-outline' },
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

  // Handle website press
  const handleWebsitePress = () => {
    const website = aboutInfo.website || 'shop.com';
    Linking.openURL(`https://${website}`);
  };

  // Handle phone press
  const handlePhonePress = () => {
    const phone = aboutInfo.phone || '412 3456';
    Linking.openURL(`tel:${phone}`);
  };

  const AboutUsTab = () => {
    const address = business.locations?.[0]?.address || 'ShopName, XYZ Road, Beau Bassin, Mauritius';
    const website = aboutInfo.website || 'shop.com';
    const phone = aboutInfo.phone || '412 3456';

    return (
      <View style={styles.aboutContainer}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: mockMapLocation.latitude,
              longitude: mockMapLocation.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: mockMapLocation.latitude,
                longitude: mockMapLocation.longitude,
              }}
            />
          </MapView>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Address */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: appTheme.colors.text }]}>Address</Text>
            <Text style={[styles.infoValue, { color: appTheme.colors.secondary }]}>
              {address}
            </Text>
          </View>

          {/* Website */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: appTheme.colors.text }]}>Website</Text>
            <TouchableOpacity onPress={handleWebsitePress}>
              <Text style={styles.infoLink}>{website}</Text>
            </TouchableOpacity>
          </View>

          {/* Phone number */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: appTheme.colors.text }]}>Phone number</Text>
            <TouchableOpacity onPress={handlePhonePress}>
              <Text style={styles.infoLink}>{phone}</Text>
            </TouchableOpacity>
          </View>

          {/* Business Hours */}
          <View style={styles.businessHoursSection}>
            <Text style={[styles.infoLabel, { color: appTheme.colors.text }]}>Business Hours</Text>
            {mockBusinessHours.map((hours) => (
              <View key={hours.day} style={styles.hoursRow}>
                <Text style={[styles.hoursDay, { color: appTheme.colors.text }]}>
                  {hours.day}
                </Text>
                <Text style={[
                  styles.hoursTime, 
                  { color: hours.open === 'Closed' ? appTheme.colors.textLight : appTheme.colors.secondary }
                ]}>
                  {hours.open === 'Closed' ? 'Closed' : `${hours.open} - ${hours.close}`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

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
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
          { text: 'OK', style: 'cancel' },
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
          keyboardShouldPersistTaps="handled"
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

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + (isCartPopupVisible && cartItems.length > 0 ? 120 : 0)
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cover Image - matching BusinessProfileOwnScreen */}
        <View style={styles.coverContainer}>
          <Image
            source={{ 
              uri: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' 
            }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          {/* Floating Back Button */}
          <TouchableOpacity
            style={[styles.floatingBackButton, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-back" size={24} color={appTheme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Section - Matching BusinessProfileOwnScreen UI */}
        <View style={styles.profileSection}>
          {/* Business Logo - 80x80 */}
          <View style={styles.avatarContainer}>
            <Avatar
              userId={business.id || ''}
              userName={business.name || 'Business'}
              imageUri={business.logo}
              size={80}
            />
          </View>

          {/* Business Name - 24px bold */}
          <Text style={[styles.businessName, { color: appTheme.colors.text }]}>
            {business.name}
          </Text>

          {/* Industry/Type - 16px medium, secondary color */}
          <Text style={[styles.industryText, { color: appTheme.colors.secondary }]}>
            Distributor
          </Text>

          {/* Description - 14px medium, secondary color */}
          {aboutInfo.description ? (
            <Text style={[styles.description, { color: appTheme.colors.secondary }]} numberOfLines={3}>
              {aboutInfo.description}
            </Text>
          ) : (
            <Text style={[styles.descriptionPlaceholder, { color: appTheme.colors.textLight }]}>
              No description available
            </Text>
          )}

          {/* Social Stats - Connections count */}
          <View style={styles.socialStats}>
            <TouchableOpacity 
              style={styles.socialStatItem}
              onPress={() => {
                // @ts-ignore
                navigation.navigate('Connections', { userId: businessId });
              }}
            >
              <Text style={[styles.socialStatCount, { color: appTheme.colors.text }]}>
                {(business as any).connections_count ?? 128}
              </Text>
              <Text style={[styles.socialStatLabel, { color: appTheme.colors.secondary }]}>
                Connections
              </Text>
            </TouchableOpacity>
          </View>

          {/* Profile Action Buttons - Based on ProfileViewType (OTHER_BUSINESS) */}
          <ProfileActionButtons
            viewType={viewType}
            onPrimaryPress={handlePrimaryAction}
            onSecondaryPress={handleSecondaryAction}
            style={styles.actionButtons}
          />
        </View>
 
        {/* Tab Bar - matching BusinessProfileOwnScreen */}
        <View style={[styles.tabBar, { borderBottomColor: appTheme.colors.borderColor }]}>
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.7}
              >
                <Icon 
                  name={tab.icon as any} 
                  size={20} 
                  color={isSelected ? appTheme.colors.primary : appTheme.colors.iconMuted} 
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: isSelected ? appTheme.colors.primary : appTheme.colors.textMuted },
                    isSelected && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {isSelected && (
                  <View style={[styles.tabIndicator, { backgroundColor: appTheme.colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
 
        {/* Tab Content */}
        <View style={styles.tabContentOuterContainer}>
          {activeTab === 'about' && <AboutUsTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'cart' && <CartTab />}
        </View>
      </ScrollView>

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
  },
  scrollView: {
    flex: 1,
  },
  // Cover image styles - matching BusinessProfileOwnScreen
  coverContainer: {
    height: COVER_HEIGHT,
    width: '100%',
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  floatingBackButton: {
    position: 'absolute',
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Profile Section - Matching BusinessProfileOwnScreen
  profileSection: {
    paddingHorizontal: 12,
    paddingTop: 16, // 16px gap between cover and profile
    paddingBottom: theme.spacing.md,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  businessName: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginTop: theme.spacing.xs,
  },
  industryText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    marginTop: theme.spacing.xs,
  },
  description: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    lineHeight: 20,
    marginTop: 16,
  },
  descriptionPlaceholder: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    fontStyle: 'italic',
    marginTop: 8,
  },
  socialStats: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
    gap: 24,
  },
  socialStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socialStatCount: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  socialStatLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    gap: 10,
  },
  // Tab bar styles - per design.json filterBar spec
  tabBar: {
    flexDirection: 'row',
    height: 40,
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 12,
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
  },
  tabTextActive: {
    fontFamily: theme.fonts.primary.bold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
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
  // About tab styles - matching BusinessProfileOwnScreen
  aboutContainer: {
    flex: 1,
  },
  mapContainer: {
    height: 280,
    width: '100%',
    backgroundColor: '#F5F5F5',
  },
  map: {
    flex: 1,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  infoItem: {
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  infoLink: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    color: '#0066FF',
  },
  businessHoursSection: {
    marginTop: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  hoursDay: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  hoursTime: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
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
    fontFamily: 'InterCustom-SemiBold',
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