import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, Dimensions, StyleSheet, Linking, StatusBar, ScrollView, Alert, Share, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonRow, SkeletonColumn } from '@/shared/components/ui/Skeleton';
import { get as apiGet } from '@/shared/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import BrandCard from '@/features/brands/components/BrandCard';
import ProductCardOtherCompany from '@/features/products/components/ProductCardOtherCompany';
import CartPopup from '@/features/cart/components/CartPopup';
import CartItemCard from '@/features/cart/components/CartItemCard';
import CartBottomSection from '@/features/cart/components/CartBottomSection';
import ProfileActionButtons from '@/features/profile/components/ProfileActionButtons';
import { useFollowStatus } from '@/features/follow/hooks/useFollowStatus';
import Avatar from '@/shared/components/ui/Avatar';
import { useAppStore } from '@/shared/store';
import { useProfileStore } from '@/shared/store/profileStore';
import { useOrderStore } from '@/shared/store/orderStore';
import { useProfileViewType } from '@/shared/hooks/useProfileViewType';
import { getRelationshipAction } from '@/shared/types/profile';
import { sendBusinessConnectionRequest, acceptBusinessConnectionRequest } from '@/features/connections/connections.service';
import { createPublicOrder } from '@/shared/services/orders';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import MapView, { Marker } from 'react-native-maps';
import { requestToJoinCompany } from '@/features/notifications/notifications.service';

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
  { key: 'people', label: 'People', icon: 'people-outline' },
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
  const businessId = route.params?.businessId || '';
  const expandBrandId = route.params?.expandBrandId;

  // API data state
  const [business, setBusiness] = useState<any>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeBusinessId = useProfileStore((state) => state.activeBusinessId);
  const activeMode = useProfileStore((state) => state.activeMode);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const currentUser = useProfileStore((state) => state.currentUser);

  // Check if the current user is already a member of this business (not shown in personal mode if member)
  const isAlreadyMember = useMemo(
    () => userBusinesses.some((ub: any) => ub.business?.id === businessId),
    [userBusinesses, businessId],
  );

  // Fetch business and brands data from API
  const fetchBusinessData = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      setError(null);
      const viewerParam = activeBusinessId ? `?viewerBusinessId=${activeBusinessId}` : '';
      const [bizData, brandsData] = await Promise.all([
        apiGet<any>(`/companies/${businessId}${viewerParam}`),
        apiGet<any[]>(`/companies/${businessId}/brands${viewerParam}`).catch(() => []),
      ]);
      setBusiness(bizData);
      setBrands(brandsData || []);
    } catch (err) {
      console.error('Failed to load business profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [businessId, activeBusinessId]);

  useEffect(() => {
    fetchBusinessData();
  }, [fetchBusinessData]);

  // Derived about info from API data
  const aboutInfo = useMemo(() => {
    return {
      description: business?.description || '',
      website: business?.website || '',
      phone: business?.phone || business?.locations?.[0]?.phone || '',
      businessHours: mockBusinessHours,
      mapLocation: business?.locations?.[0]
        ? { latitude: business.locations[0].latitude || -20.232, longitude: business.locations[0].longitude || 57.498 }
        : mockMapLocation,
    };
  }, [business]);

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

  // Public storefront ordering: a personal-mode viewer can order from a business
  // whose location is an INDEPENDENT, public, Enterprise-enabled storefront
  // (mirrors the backend isLocationPublicEffective check). Business-mode viewers
  // keep using the existing B2B cart/placeOrder flow.
  const publicOrderLocation = useMemo(() => {
    if (canOrder) return null;
    if (!business?.capabilities?.canEnablePublicLocationPages) return null;
    return (business?.locations || []).find(
      (l: any) => l.operatingMode === 'INDEPENDENT' && l.isPublic === true,
    ) || null;
  }, [business, canOrder]);
  const canOrderPublic = !!publicOrderLocation && !isOwnProfile;
  const effectiveCanOrder = canOrder || canOrderPublic;

  // Relationship button rule (see docs/PROFILES.md):
  // personal mode → Follow (person → business); business mode → Connect (business ↔ business).
  const relationshipAction = getRelationshipAction(activeMode, 'business');

  // Follow state (used as the secondary button in personal mode)
  const { isFollowing, toggleFollow, loading: followLoading } = useFollowStatus(businessId);

  // Business ↔ business connection state (used as the secondary button in business mode)
  const [connectLoading, setConnectLoading] = useState(false);
  const bizConn = business?.businessConnectionStatus as
    | { id: string; status: string; direction: string }
    | null
    | undefined;
  
  // Legacy cart store - used by CartPopup, CartItemCard, CartBottomSection components
  const { cartItems, addToCart: legacyAddToCart, removeFromCart, clearCart: legacyClearCart } = useAppStore();
  
  // B2B order store - per-business carts, connected to backend API
  const { 
    getCart, 
    addToCart: addToOrderCart, 
    clearCart: clearOrderCart 
  } = useOrderStore();
  
  // Determine which tabs to show based on mode
  const TABS = useMemo(() => {
    if (isBusinessMode || canOrderPublic) {
      return [...BASE_TABS, CART_TAB];
    }
    return BASE_TABS;
  }, [isBusinessMode, canOrderPublic]);

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
  const handleProductAddedToCart = (_productId: string, _quantity: number) => {
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
      id: `biz-chat-${business.id}`, 
      name: business.name, 
      avatar: business.logo,
      isGroup: false,
      partnerId: business.id,
      partnerType: 'business',
      unreadCount: 0,
    });
  };

  // Connect button label reflecting the business ↔ business connection status
  const getBizConnectLabel = () => {
    if (!bizConn) return 'Connect';
    if (bizConn.status === 'accepted') return 'Connected';
    if (bizConn.status === 'pending' && bizConn.direction === 'sent') return 'Pending';
    if (bizConn.status === 'pending' && bizConn.direction === 'received') return 'Accept';
    return 'Connect';
  };

  // Business ↔ business connect flow (request / accept), mirroring the user connect flow
  const handleBusinessConnect = () => {
    if (!activeBusiness) {
      Alert.alert('Business Mode required', 'Switch to a business to connect with another business.');
      return;
    }
    if (bizConn?.status === 'accepted') {
      Alert.alert('Already Connected', `${activeBusiness.name} is already connected with ${business.name}.`);
      return;
    }
    if (bizConn?.status === 'pending' && bizConn.direction === 'sent') {
      Alert.alert('Request Pending', 'Your connection request is already pending.');
      return;
    }
    if (bizConn?.status === 'pending' && bizConn.direction === 'received') {
      Alert.alert('Accept Request', `Accept connection request from ${business.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setConnectLoading(true);
              await acceptBusinessConnectionRequest(bizConn.id);
              fetchBusinessData();
            } catch {
              Alert.alert('Error', 'Failed to accept connection request.');
            } finally {
              setConnectLoading(false);
            }
          },
        },
      ]);
      return;
    }

    Alert.alert('Connect', `Send a connection request from ${activeBusiness.name} to ${business.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Connect',
        onPress: async () => {
          try {
            setConnectLoading(true);
            await sendBusinessConnectionRequest(activeBusiness.id, business.id);
            fetchBusinessData();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.error || 'Failed to send connection request.');
          } finally {
            setConnectLoading(false);
          }
        },
      },
    ]);
  };

  // Secondary button action depends on mode: Follow (personal) or Connect (business)
  const handleSecondaryAction = () => {
    if (relationshipAction === 'follow') {
      toggleFollow();
    } else if (relationshipAction === 'connect') {
      handleBusinessConnect();
    }
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

  const handleMoreOptions = () => {
    const options: any[] = [
      { text: 'Share', onPress: handleShareProfile },
      { text: 'Report', onPress: () => {} },
      { text: 'Block', onPress: () => {} },
    ];

    // Follow/Connect now live in the secondary action button (see docs/PROFILES.md),
    // not in this menu.

    // Add "Request to Join" only in personal mode when not already a member
    if (activeMode === 'personal' && !isAlreadyMember) {
      options.unshift({
        text: 'Request to Join',
        onPress: () => {
          Alert.alert(
            'Request to Join',
            `Send a request to join ${business?.name || 'this company'}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Send Request',
                onPress: async () => {
                  try {
                    await requestToJoinCompany(businessId);
                    Alert.alert('Request Sent', `Your request to join ${business?.name || 'the company'} has been sent.`);
                  } catch (err: any) {
                    const msg = err?.response?.data?.error?.message || 'Failed to send request. Please try again.';
                    Alert.alert('Error', msg);
                  }
                },
              },
            ],
          );
        },
      });
    }

    Alert.alert('Options', 'Select an action', [
      ...options,
      { text: 'Cancel', style: 'cancel' },
    ]);
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
        quantity 
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
    
    // Add to B2B order store (per-business cart, connected to backend)
    if (business) {
      addToOrderCart(business.id, business.name, {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || product.image,
        unit: product.unit,
      }, quantity);
    }
    
    // Also add to legacy store so CartPopup/CartItemCard/CartBottomSection UI works
    legacyAddToCart(product, quantity);
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
          canAddToCart={effectiveCanOrder}
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

  // People tab - shows accepted business members
  const [people, setPeople] = useState<any[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleFetched, setPeopleFetched] = useState(false);

  useEffect(() => {
    if (activeTab === 'people' && !peopleFetched && businessId) {
      setPeopleLoading(true);
      apiGet<any[]>(`/businesses/${businessId}/people`)
        .then(data => setPeople(data || []))
        .catch(() => setPeople([]))
        .finally(() => { setPeopleLoading(false); setPeopleFetched(true); });
    }
  }, [activeTab, peopleFetched, businessId]);

  const PeopleTab = () => {
    if (peopleLoading) {
      return (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={appTheme.colors.primary} />
        </View>
      );
    }

    if (people.length === 0) {
      return (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: appTheme.colors.textLight, fontSize: 14, fontFamily: theme.fonts.primary.regular }}>
            No team members to display
          </Text>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        {people.map((person: any) => (
          <TouchableOpacity
            key={person.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: appTheme.colors.borderColor,
            }}
            onPress={() => navigation.navigate('ViewUserProfile', { userId: person.id })}
            activeOpacity={0.7}
          >
            <Avatar
              userId={person.id}
              userName={person.name || ''}
              imageUri={person.avatar}
              size={44}
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: theme.fonts.primary.semiBold, color: appTheme.colors.text }}>
                {person.name}
              </Text>
              {person.jobTitle ? (
                <Text style={{ fontSize: 13, fontFamily: theme.fonts.primary.regular, color: appTheme.colors.secondary, marginTop: 2 }}>
                  {person.jobTitle}
                </Text>
              ) : null}
            </View>
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 4,
              backgroundColor: person.role === 'super_admin' ? appTheme.colors.primary + '20' : appTheme.colors.borderColor,
            }}>
              <Text style={{
                fontSize: 11,
                fontFamily: theme.fonts.primary.medium,
                color: person.role === 'super_admin' ? appTheme.colors.primary : appTheme.colors.secondary,
                textTransform: 'capitalize',
              }}>
                {person.role === 'super_admin' ? 'Owner' : person.role}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const AboutUsTab = () => {
    const address = business?.address || business?.locations?.[0]?.address || 'No address available';
    const website = aboutInfo.website || 'shop.com';
    const phone = aboutInfo.phone || '412 3456';

    return (
      <View style={styles.aboutContainer}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: aboutInfo.mapLocation?.latitude || -20.232,
              longitude: aboutInfo.mapLocation?.longitude || 57.498,
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
                latitude: aboutInfo.mapLocation?.latitude || -20.232,
                longitude: aboutInfo.mapLocation?.longitude || 57.498,
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
                  canAddToCart={effectiveCanOrder}
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

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Personal-mode public storefront checkout (guest contact details).
  const [showPublicCheckout, setShowPublicCheckout] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestNotes, setGuestNotes] = useState('');

  const openPublicCheckout = () => {
    setGuestName(currentUser?.name || '');
    setGuestPhone((currentUser as any)?.phone || '');
    setGuestAddress('');
    setGuestNotes('');
    setShowPublicCheckout(true);
  };

  const submitPublicOrder = async () => {
    if (!publicOrderLocation) return;
    if (!guestName.trim() || !guestPhone.trim()) {
      Alert.alert('Missing info', 'Please enter your name and phone number.');
      return;
    }
    const cart = getCart(business.id);
    const items = (cart?.items || []).map((i: any) => ({ productId: i.productId, quantity: i.quantity }));
    if (items.length === 0) {
      Alert.alert('Empty cart', 'Add at least one product before placing an order.');
      return;
    }
    setIsPlacingOrder(true);
    try {
      const order = await createPublicOrder(publicOrderLocation.id, {
        customerName: guestName.trim(),
        customerPhone: guestPhone.trim(),
        customerAddress: guestAddress.trim() || undefined,
        items,
        notes: guestNotes.trim() || undefined,
      });
      legacyClearCart();
      clearOrderCart(business.id);
      setShowPublicCheckout(false);
      Alert.alert('Order placed!', `Your order #${order.id} has been sent to ${business.name}.`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.error || err?.message || 'Failed to place order. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    // Personal-mode customer ordering from a business's public storefront.
    if (!isBusinessMode && canOrderPublic) {
      openPublicCheckout();
      return;
    }
    if (!isBusinessMode || !activeBusiness) {
      Alert.alert('Error', 'You must be in Business Mode to place orders.');
      return;
    }
    
    setIsPlacingOrder(true);
    try {
      const { placeOrder } = useOrderStore.getState();
      const order = await placeOrder(
        activeBusiness.id,
        activeBusiness.name,
        business.id,
        business.name
      );
      
      if (order) {
        // Also clear the legacy cart (used by CartPopup/CartItemCard/CartBottomSection)
        legacyClearCart();
        
        Alert.alert(
          'Order Placed!',
          `Your order #${order.id} has been sent to ${business.name}.`,
          [
            { 
              text: 'Go to Chat', 
              onPress: () => {
                navigation.navigate('Chat', {
                  id: `biz-chat-${business.id}`,
                  name: business.name,
                  avatar: business.logo,
                  isGroup: false,
                  partnerId: business.id,
                  partnerType: 'business' as const,
                  unreadCount: 0,
                });
              }
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to place order. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
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
              businessId={business.id}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  // Loading state - skeleton that mimics the profile layout
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Cover image skeleton */}
          <Skeleton width={SCREEN_WIDTH} height={COVER_HEIGHT} borderRadius={0} />
          {/* Profile section skeleton */}
          <View style={{ paddingHorizontal: 12, paddingTop: 16 }}>
            <SkeletonCircle size={80} />
            <Skeleton width="50%" height={24} style={{ marginTop: 12 }} />
            <Skeleton width="35%" height={16} style={{ marginTop: 8 }} />
            <Skeleton width="80%" height={14} style={{ marginTop: 16 }} />
            <Skeleton width="60%" height={14} style={{ marginTop: 6 }} />
            {/* Stats skeleton */}
            <SkeletonRow gap={8} style={{ marginTop: 16 }}>
              <Skeleton width={30} height={16} />
              <Skeleton width={80} height={14} />
            </SkeletonRow>
            {/* Action buttons skeleton */}
            <SkeletonRow gap={10} style={{ marginTop: 16 }}>
              <Skeleton width="48%" height={40} borderRadius={8} />
              <Skeleton width="48%" height={40} borderRadius={8} />
            </SkeletonRow>
          </View>
          {/* Tab bar skeleton */}
          <SkeletonRow gap={0} style={{ marginTop: 20, paddingHorizontal: 16, justifyContent: 'space-around' }}>
            <Skeleton width={70} height={14} />
            <Skeleton width={70} height={14} />
          </SkeletonRow>
          {/* Product list skeleton */}
          <View style={{ paddingTop: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} gap={12} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <Skeleton width={48} height={48} borderRadius={8} />
                <SkeletonColumn gap={6} style={{ flex: 1 }}>
                  <Skeleton width="50%" height={16} />
                  <Skeleton width="30%" height={13} />
                </SkeletonColumn>
              </SkeletonRow>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Error state
  if (error || !business) {
    return (
      <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: insets.top + 10, left: 12, width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-back" size={24} color={appTheme.colors.text} />
          </TouchableOpacity>
          <Icon name="business-outline" size={48} color={appTheme.colors.textMuted} />
          <Text style={{ fontSize: 16, fontFamily: theme.fonts.primary.medium, color: appTheme.colors.secondary, marginTop: 12 }}>
            {error || 'Business not found'}
          </Text>
          <TouchableOpacity onPress={fetchBusinessData} style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ fontSize: 16, fontFamily: theme.fonts.primary.semiBold, color: appTheme.colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
              uri: business?.bannerUrl || 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
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
              userId={business?.id || ''}
              userName={business?.name || 'Business'}
              imageUri={business?.logoUrl}
              size={80}
            />
          </View>

          {/* Business Name + Verified Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.businessName, { color: appTheme.colors.text }]}>
              {business?.name}
            </Text>
            {business?.isVerified && (
              <Icon name="checkmark-circle" size={22} color={appTheme.colors.info} />
            )}
          </View>

          {/* Industry/Type - 16px medium, secondary color */}
          {business?.industry ? (
            <Text style={[styles.industryText, { color: appTheme.colors.secondary }]}>
              {business.industry.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </Text>
          ) : null}

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

          {/* Social Stats - Connections + Followers */}
          <View style={styles.socialStats}>
            <TouchableOpacity
              style={styles.socialStatItem}
              onPress={() => {
                // @ts-ignore
                navigation.navigate('Connections', { userId: businessId });
              }}
            >
              <Text style={[styles.socialStatCount, { color: appTheme.colors.text }]}>
                {business?.connectionsCount ?? 0}
              </Text>
              <Text style={[styles.socialStatLabel, { color: appTheme.colors.secondary }]}>
                Connections
              </Text>
            </TouchableOpacity>
            <View style={styles.socialStatItem}>
              <Text style={[styles.socialStatCount, { color: appTheme.colors.text }]}>
                {business?.followersCount ?? 0}
              </Text>
              <Text style={[styles.socialStatLabel, { color: appTheme.colors.secondary }]}>
                Followers
              </Text>
            </View>
          </View>

          {/* Profile Action Buttons - Message + (Follow in personal mode / Connect in business mode) + ⋮ */}
          <ProfileActionButtons
            viewType={viewType}
            onPrimaryPress={handlePrimaryAction}
            onSecondaryPress={handleSecondaryAction}
            onMoreOptionsPress={handleMoreOptions}
            secondaryLabel={
              relationshipAction === 'follow'
                ? (isFollowing ? 'Following' : 'Follow')
                : getBizConnectLabel()
            }
            secondaryVariant={
              relationshipAction === 'follow'
                ? (isFollowing ? 'outline' : 'primary')
                : (bizConn?.status === 'accepted' ? 'outline' : 'primary')
            }
            secondaryLoading={relationshipAction === 'follow' ? followLoading : connectLoading}
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
          {activeTab === 'people' && <PeopleTab />}
          {activeTab === 'cart' && <CartTab />}
        </View>
      </ScrollView>

      {/* Cart Popup - Fixed across all tabs */}
      <CartPopup
        isVisible={effectiveCanOrder && isCartPopupVisible && activeTab === 'products'}
        onClose={handleCartPopupClose}
        onAddToCart={handleAddToCart}
        onGoToCart={handleGoToCart}
      />

      {/* Cart Bottom Section - Only show on cart tab with items */}
      {activeTab === 'cart' && cartItems.length > 0 && (
        <CartBottomSection businessId={business.id} onPlaceOrder={handlePlaceOrder} />
      )}

      {/* Public storefront checkout (personal-mode customer) */}
      <Modal
        visible={showPublicCheckout}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPublicCheckout(false)}
      >
        <View style={styles.checkoutOverlay}>
          <View style={[styles.checkoutSheet, { backgroundColor: appTheme.colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.checkoutHeader}>
              <Text style={[styles.checkoutTitle, { color: appTheme.colors.text }]}>Your details</Text>
              <TouchableOpacity onPress={() => setShowPublicCheckout(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={24} color={appTheme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.checkoutSubtitle, { color: appTheme.colors.secondary }]}>
              We'll share these with {business?.name} so they can fulfil your order.
            </Text>

            <TextInput
              style={[styles.checkoutInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor }]}
              placeholder="Full name"
              placeholderTextColor={appTheme.colors.textMuted}
              value={guestName}
              onChangeText={setGuestName}
            />
            <TextInput
              style={[styles.checkoutInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor }]}
              placeholder="Phone number"
              placeholderTextColor={appTheme.colors.textMuted}
              keyboardType="phone-pad"
              value={guestPhone}
              onChangeText={setGuestPhone}
            />
            <TextInput
              style={[styles.checkoutInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor }]}
              placeholder="Delivery address (optional)"
              placeholderTextColor={appTheme.colors.textMuted}
              value={guestAddress}
              onChangeText={setGuestAddress}
            />
            <TextInput
              style={[styles.checkoutInput, styles.checkoutNotes, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor }]}
              placeholder="Notes (optional)"
              placeholderTextColor={appTheme.colors.textMuted}
              value={guestNotes}
              onChangeText={setGuestNotes}
              multiline
            />

            <TouchableOpacity
              style={[styles.checkoutSubmit, { backgroundColor: appTheme.colors.primary }, isPlacingOrder && { opacity: 0.6 }]}
              onPress={submitPublicOrder}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.checkoutSubmitText}>Place order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#FAF8F5',
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
    color: '#A8A29E',
    marginTop: 80,
  },
  // About tab styles - matching BusinessProfileOwnScreen
  aboutContainer: {
    flex: 1,
  },
  mapContainer: {
    height: 280,
    width: '100%',
    backgroundColor: '#FAF8F5',
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
    color: '#2A75E6',
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
    color: '#A8A29E',
    marginTop: 15,
  },
  orderButton: {
    marginTop: 24,
    backgroundColor: '#1C1917',
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
    color: '#A8A29E',
    marginTop: 40,
  },
  // Public storefront checkout modal
  checkoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  checkoutSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkoutTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  checkoutSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 4,
    marginBottom: 16,
  },
  checkoutInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 12,
  },
  checkoutNotes: {
    height: 80,
    textAlignVertical: 'top',
  },
  checkoutSubmit: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  checkoutSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },

}); 