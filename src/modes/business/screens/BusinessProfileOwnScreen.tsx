/**
 * BusinessProfileOwnScreen - Business Mode
 * View/Edit own business profile with Products and About tabs
 * Based on app-logic.json screens.businessMode.profile
 * Following design.json specifications
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, ActivityIndicator, Animated, Modal, Dimensions, FlatList, Linking, StatusBar } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { HeroHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore, getRoleDisplayName } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import Avatar from '@/shared/components/ui/Avatar';
import { AppButton, EmptyState, Skeleton, SkeletonCircle, SkeletonRow, SkeletonColumn } from '@/shared/components/ui';
import BrandCard from '@/features/brands/components/BrandCard';
import ProductCard from '@/features/products/components/ProductCard';
import ProfileActionButtons from '@/features/profile/components/ProfileActionButtons';
import { useProfileViewType } from '@/shared/hooks/useProfileViewType';
import { ProfileViewType } from '@/shared/types/profile';
import {
  canEditBusinessProfile,
  canManageStaff,
  canPublishBusinessPage,
  canDeleteBusiness,
  checkPaywall,
} from '@/shared/utils/permissions';
import { useProducts } from '@/features/products/hooks/useProducts';
import type { UIProduct } from '@/shared/types/product';
import { SubscriptionWarningBanner, useSubscription } from '@/features/payments';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = SCREEN_WIDTH * (4 / 3); // 3:4 aspect ratio

// Tab configuration
const TABS = [
  { key: 'products', label: 'Products', icon: 'cube-outline' },
  { key: 'about', label: 'About Us', icon: 'person-outline' },
] as const;
type Tab = typeof TABS[number]['key'];

// Process products into brands
interface DisplayBrand {
  name: string;
  logo?: string;
  productCount: number;
  products: UIProduct[];
}



const processProductsToBrands = (products: UIProduct[]): DisplayBrand[] => {
  const brandsMap = new Map<string, { logo?: string; products: UIProduct[] }>();
  
  products.forEach(product => {
    if (!brandsMap.has(product.brand)) {
      brandsMap.set(product.brand, { logo: product.brandLogo, products: [] });
    }
    brandsMap.get(product.brand)!.products.push(product);
  });

  return Array.from(brandsMap.entries())
    .map(([name, data]) => ({
      name,
      logo: data.logo,
      productCount: data.products.length,
      products: data.products,
    }))
    .filter(brand => brand.productCount > 0);
};

export default function BusinessProfileOwnScreen() {
  const navigation = useNavigation();
  const { theme: appTheme, isDarkMode } = useTheme();

  // Profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);
  const setLocation = useBusinessStore((state) => state.setLocation);
  const switchToPersonal = useProfileStore((state) => state.switchToPersonal);
  const currentUser = useProfileStore((state) => state.currentUser);
  const storeLocations = useBusinessStore((state) => state.locations);

  // Determine profile view type - this is SELF_BUSINESS (viewing own business)
  const { viewType, isOwnProfile, canEdit: canEditFromHook } = useProfileViewType({
    profileId: activeBusiness?.id,
    profileType: 'business',
  });

  // Local state
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [expandedBrandName, setExpandedBrandName] = useState<string | null>(null);
  const [isProfileSwitcherVisible, setIsProfileSwitcherVisible] = useState(false);
  const [isAddBusinessOptionsVisible, setIsAddBusinessOptionsVisible] = useState(false);
  const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Get locations for a business from the store
  const getBusinessLocations = (businessId: string) =>
    storeLocations.filter(loc => (loc as any).companyId === businessId);

  // Animation for modal
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  const modalTranslateY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Animation for add business options modal
  const addOptionsOverlayOpacity = React.useRef(new Animated.Value(0)).current;
  const addOptionsModalTranslateY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Permissions (combine with role-based permissions)
  const canEdit = canEditBusinessProfile(currentUserRole) && canEditFromHook;
  const canManageTeam = canManageStaff(currentUserRole);
  const canPublish = canPublishBusinessPage(currentUserRole, activeBusiness?.plan || null);
  const canDelete = canDeleteBusiness(currentUserRole);

  // Get products from real hook instead of mock data
  const { products, loading: loadingProducts } = useProducts();

  // Subscription status for warning banner
  const { subscription, isActive: isSubActive, daysRemaining } = useSubscription(activeBusiness?.id || '');

  // Process products for display (only show published/displayable products on profile)
  const displayBrands = useMemo(
    () => processProductsToBrands(products.filter(p => p.isDisplayable)),
    [products]
  );

  const handleEditProfile = () => {
    if (!canEdit) {
      AppAlert.alert('Access Denied', 'You do not have permission to edit business settings.');
      return;
    }
    // @ts-ignore
    navigation.navigate('EditBusiness', { businessId: activeBusiness?.id });
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${activeBusiness?.name} on NouPro!`,
        title: 'Share Business',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSettings = () => {
    // @ts-ignore
    navigation.navigate('CompanySettings');
  };

  const handleBrandPress = (brandName: string) => {
    setExpandedBrandName(prev => (prev === brandName ? null : brandName));
  };

  const handleProductPress = (productId: string) => {
    // @ts-ignore
    navigation.navigate('ProductDetail', { productId });
  };

  // Profile switcher modal functions
  const openProfileSwitcher = () => {
    setIsProfileSwitcherVisible(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeProfileSwitcher = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsProfileSwitcherVisible(false);
    });
  };

  const handlePersonalSelect = async () => {
    try {
      await switchToPersonal();
      closeProfileSwitcher();
      navigation.navigate('MainTabs');
    } catch (error) {
      console.error('Error switching to personal:', error);
    }
  };

  const handleBusinessSelect = async (businessId: string) => {
    try {
      await switchToBusiness(businessId);
      closeProfileSwitcher();
    } catch (error) {
      console.error('Error switching business:', error);
    }
  };

  const handleBusinessPress = (businessId: string) => {
    const locations = getBusinessLocations(businessId);
    if (locations && locations.length > 1) {
      // Toggle expansion if business has multiple locations
      setExpandedBusinessId(expandedBusinessId === businessId ? null : businessId);
    } else {
      // Switch directly if single location or no locations
      handleBusinessSelect(businessId);
    }
  };

  const handleLocationSelect = async (businessId: string, locationId: string) => {
    try {
      // Set selected location and switch business
      setSelectedLocationId(locationId);
      await switchToBusiness(businessId);
      closeProfileSwitcher();
      const selectedLocation = getBusinessLocations(businessId)?.find(
        (location) => location.id === locationId
      );
      if (selectedLocation) {
        setLocation({
          id: selectedLocation.id,
          companyId: businessId,
          name: selectedLocation.name,
          address: selectedLocation.address,
          phone: undefined,
          email: undefined,
          latitude: undefined,
          longitude: undefined,
        });
      }
    } catch (error) {
      console.error('Error switching to location:', error);
    }
  };

  // Add business options modal functions
  const openAddBusinessOptions = () => {
    setIsAddBusinessOptionsVisible(true);
    Animated.parallel([
      Animated.timing(addOptionsOverlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(addOptionsModalTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeAddBusinessOptions = () => {
    Animated.parallel([
      Animated.timing(addOptionsOverlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(addOptionsModalTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsAddBusinessOptionsVisible(false);
    });
  };

  const handleCreateNewBusiness = () => {
    closeAddBusinessOptions();
    setTimeout(() => {
      // @ts-ignore
      navigation.navigate('BusinessBasicInfo', { fromProfileSwitcher: true });
    }, 100);
  };

  const handleJoinBusiness = () => {
    closeAddBusinessOptions();
    setTimeout(() => {
      // @ts-ignore
      navigation.navigate('CompanySearch', { query: '', mode: 'join' });
    }, 100);
  };

  // Handle URL links
  const handleWebsitePress = () => {
    const website = activeBusiness?.website;
    if (website) {
      const url = website.startsWith('http') ? website : `https://${website}`;
      Linking.openURL(url);
    }
  };

  const handlePhonePress = () => {
    const phone = activeBusiness?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
    }
  };

  // Render cover image (the settings control lives in the HeroHeader overlay)
  const renderCoverImage = () => (
    <View style={styles.coverContainer}>
      <Image
        source={{
          uri: activeBusiness?.banner_url ||
            'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
        }}
        style={styles.coverImage}
        resizeMode="cover"
      />
    </View>
  );

  // Render profile section
  const renderProfileSection = () => (
    <View style={styles.profileSection}>
      {/* Business Logo */}
      <View style={styles.avatarContainer}>
        <Avatar
          userId={activeBusiness?.id || ''}
          userName={activeBusiness?.name || 'Business'}
          imageUri={activeBusiness?.logo_url}
          size={80}
        />
      </View>

      {/* Business Name with dropdown */}
      <TouchableOpacity 
        style={styles.nameRow}
        onPress={openProfileSwitcher}
        activeOpacity={0.7}
      >
        <Text style={[styles.businessName, { color: appTheme.colors.text }]}>
          {activeBusiness?.name || 'Business Name'}
        </Text>
        <View style={styles.dropdownArrow}>
          <Icon name="chevron-down" size={18} color={appTheme.colors.text} />
        </View>
      </TouchableOpacity>

      {/* Industry */}
      {activeBusiness?.industry && (
        <Text style={[styles.industryText, { color: appTheme.colors.secondary }]}>
          {activeBusiness.industry}
        </Text>
      )}

      {/* Description */}
      {activeBusiness?.description ? (
        <Text style={[styles.description, { color: appTheme.colors.secondary }]}>
          {activeBusiness.description}
        </Text>
      ) : (
        <Text style={[styles.descriptionPlaceholder, { color: appTheme.colors.textLight }]}>
          Add a description for your business
        </Text>
      )}

      {/* Social Stats */}
      <View style={styles.socialStats}>
        <TouchableOpacity 
          style={styles.socialStatItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('Connections', { userId: activeBusiness?.id || '' });
          }}
        >
          <Text style={[styles.socialStatCount, { color: appTheme.colors.text }]}>
            {activeBusiness?.connections_count ?? 0}
          </Text>
          <Text style={[styles.socialStatLabel, { color: appTheme.colors.secondary }]}>
            Connections
          </Text>
        </TouchableOpacity>
      </View>

      {/* Profile Action Buttons - Based on ProfileViewType (SELF_BUSINESS) */}
      <ProfileActionButtons
        viewType={viewType}
        onPrimaryPress={handleEditProfile}
        onSecondaryPress={handleShareProfile}
        style={styles.actionButtons}
      />
    </View>
  );

  // Render tab bar
  const renderTabBar = () => (
    <View style={[styles.tabBar, { borderBottomColor: appTheme.colors.borderColor }]}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabItem,
            activeTab === tab.key && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Icon 
            name={tab.icon as any} 
            size={20} 
            color={activeTab === tab.key ? appTheme.colors.primary : appTheme.colors.iconMuted} 
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === tab.key ? appTheme.colors.primary : appTheme.colors.textMuted },
              activeTab === tab.key && styles.tabTextActive,
            ]}
          >
            {tab.label}
          </Text>
          {activeTab === tab.key && (
            <View style={[styles.tabIndicator, { backgroundColor: appTheme.colors.primary }]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render products tab
  const renderProductsTab = () => {
    if (loadingProducts) {
      return (
        <View style={styles.productsContainer}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} gap={12} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
              <Skeleton width={48} height={48} borderRadius={8} />
              <SkeletonColumn gap={6} style={{ flex: 1 }}>
                <Skeleton width="50%" height={16} />
                <Skeleton width="30%" height={13} />
              </SkeletonColumn>
              <Skeleton width={20} height={20} borderRadius={4} />
            </SkeletonRow>
          ))}
        </View>
      );
    }

    if (displayBrands.length === 0) {
      return (
        <EmptyState
          iconName="cube-outline"
          title="No products yet"
          subtitle="Products you manage or interact with will appear here."
          ctaLabel="Add product"
          onCtaPress={() => navigation.navigate('CreateProduct' as never)}
          testID="empty-business-products"
        />
      );
    }

    return (
      <View style={styles.productsContainer}>
        {displayBrands.map((brand) => (
          <View key={brand.name}>
            <BrandCard
              brandName={brand.name}
              brandLogo={brand.logo}
              productCount={brand.productCount}
              isExpanded={expandedBrandName === brand.name}
              onPress={() => handleBrandPress(brand.name)}
            />
            {expandedBrandName === brand.name && (
              brand.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isEditing={false}
                  onPress={() => handleProductPress(product.id)}
                  onUpdate={() => {}}
                />
              ))
            )}
          </View>
        ))}
      </View>
    );
  };

  // Render about tab with map like the design
  const renderAboutTab = () => {
    const address = activeBusiness?.address || 'Address not provided';
    const website = activeBusiness?.website || null;
    const phone = activeBusiness?.phone || null;
    
    return (
      <View style={styles.aboutContainer}>
        {/* Map Section - only shown when location coordinates are available */}

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
          {website ? (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.text }]}>Website</Text>
              <TouchableOpacity onPress={handleWebsitePress}>
                <Text style={styles.infoLink}>{website}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.text }]}>Website</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.textLight }]}>Not provided</Text>
            </View>
          )}

          {/* Phone number */}
          {phone ? (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.text }]}>Phone number</Text>
              <TouchableOpacity onPress={handlePhonePress}>
                <Text style={styles.infoLink}>{phone}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.text }]}>Phone number</Text>
              <Text style={[styles.infoValue, { color: appTheme.colors.textLight }]}>Not provided</Text>
            </View>
          )}

          {/* Business Hours - placeholder until DB field is added */}
          <View style={styles.businessHoursSection}>
            <Text style={[styles.infoLabel, { color: appTheme.colors.text }]}>Business Hours</Text>
            <Text style={[styles.infoValue, { color: appTheme.colors.textLight }]}>Not configured</Text>
          </View>
        </View>
      </View>
    );
  };

  // Profile Switcher Modal
  const renderProfileSwitcherModal = () => (
    <Modal
      transparent
      visible={isProfileSwitcherVisible}
      onRequestClose={closeProfileSwitcher}
      animationType="none"
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: overlayOpacity }
        ]}
      >
        <TouchableOpacity
          style={styles.modalOverlayTouchable}
          activeOpacity={1}
          onPress={closeProfileSwitcher}
        />

        <Animated.View
          style={[
            styles.modalBottomSheet,
            {
              backgroundColor: appTheme.colors.surface,
              transform: [{ translateY: modalTranslateY }]
            }
          ]}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>Switch Profile</Text>
            <TouchableOpacity onPress={closeProfileSwitcher} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color={appTheme.colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            {/* Personal Profile Section */}
            <Text style={[styles.modalSectionTitle, { color: appTheme.colors.primary }]}>
              Personal
            </Text>
            <TouchableOpacity
              style={styles.profileRow}
              onPress={handlePersonalSelect}
            >
              <Avatar
                userId={currentUser?.id || '1'}
                userName={currentUser?.name || 'User'}
                imageUri={currentUser?.avatar_url}
                size={48}
              />
              <View style={styles.profileRowInfo}>
                <Text style={[styles.profileRowName, { color: appTheme.colors.primary }]}>
                  {currentUser?.name || 'Personal Profile'}
                </Text>
                <Text style={[styles.profileRowSubtitle, { color: appTheme.colors.textSecondary }]}>
                  Personal
                </Text>
              </View>
            </TouchableOpacity>

            {/* Business Profiles Section - only shown when user has businesses */}
            {userBusinesses.length > 0 && (
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.modalSectionTitle, { color: appTheme.colors.primary }]}>
                  Businesses
                </Text>
                <TouchableOpacity
                  style={styles.addBusinessButton}
                  onPress={() => {
                    closeProfileSwitcher();
                    setTimeout(openAddBusinessOptions, 300);
                  }}
                >
                  <Icon name="add" size={24} color={appTheme.colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            {userBusinesses.map((ub) => {
              const isActive = activeBusiness?.id === ub.business.id;
              const locations = getBusinessLocations(ub.business.id);
              const hasLocations = locations && locations.length > 0;
              const isExpanded = expandedBusinessId === ub.business.id;
              // Find if this business has a selected location
              const selectedLocation = hasLocations ? locations.find(loc => loc.id === selectedLocationId) : null;
              // Business is "active" only if it's selected AND no location is selected
              const showBusinessAsActive = isActive && !selectedLocation;
              // Show all locations if expanded, or just the selected one if collapsed
              const showAllLocations = hasLocations && isExpanded;
              const showSelectedLocationOnly = !isExpanded && selectedLocation && isActive;
              
              return (
                <View key={ub.business.id}>
                  <TouchableOpacity
                    style={[
                      styles.profileRow,
                      showBusinessAsActive && styles.profileRowActive,
                    ]}
                    onPress={() => handleBusinessPress(ub.business.id)}
                  >
                    <Avatar
                      userId={ub.business.id}
                      userName={ub.business.name}
                      imageUri={ub.business.logo_url}
                      size={48}
                    />
                    <View style={styles.profileRowInfo}>
                      <Text style={[styles.profileRowName, { color: showBusinessAsActive ? '#FFFFFF' : appTheme.colors.primary }]}>
                        {ub.business.name}
                      </Text>
                      <Text style={[styles.profileRowSubtitle, { color: showBusinessAsActive ? 'rgba(255,255,255,0.7)' : appTheme.colors.textSecondary }]}>
                        {getRoleDisplayName(ub.role)}
                        {hasLocations && ` • ${locations.length} location${locations.length > 1 ? 's' : ''}`}
                      </Text>
                    </View>
                    {hasLocations && (
                      <Icon 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={showBusinessAsActive ? '#FFFFFF' : appTheme.colors.textLight} 
                      />
                    )}
                  </TouchableOpacity>
                  
                  {/* Selected location only - shown when collapsed but has selection */}
                  {showSelectedLocationOnly && (
                    <TouchableOpacity
                      style={[styles.locationRow, styles.locationRowActive]}
                      onPress={() => setExpandedBusinessId(ub.business.id)}
                    >
                      <View style={[styles.locationIconContainer, styles.locationIconContainerActive]}>
                        <Icon name="location-outline" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.locationInfo}>
                        <Text style={[styles.locationName, { color: '#FFFFFF' }]}>
                          {selectedLocation.name}
                        </Text>
                        <Text style={[styles.locationAddress, { color: 'rgba(255,255,255,0.7)' }]}>
                          {selectedLocation.address}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  
                  {/* All location options - shown when expanded */}
                  {showAllLocations && (
                    <View style={styles.locationsContainer}>
                      {locations.map((location) => {
                        const isLocationSelected = selectedLocationId === location.id;
                        return (
                          <TouchableOpacity
                            key={location.id}
                            style={[
                              styles.locationRow,
                              isLocationSelected && styles.locationRowActive,
                            ]}
                            onPress={() => handleLocationSelect(ub.business.id, location.id)}
                          >
                            <View style={[
                              styles.locationIconContainer,
                              isLocationSelected && styles.locationIconContainerActive,
                            ]}>
                              <Icon 
                                name="location-outline" 
                                size={20} 
                                color={isLocationSelected ? '#FFFFFF' : appTheme.colors.textSecondary} 
                              />
                            </View>
                            <View style={styles.locationInfo}>
                              <Text style={[
                                styles.locationName, 
                                { color: isLocationSelected ? '#FFFFFF' : appTheme.colors.primary }
                              ]}>
                                {location.name}
                              </Text>
                              <Text style={[
                                styles.locationAddress, 
                                { color: isLocationSelected ? 'rgba(255,255,255,0.7)' : appTheme.colors.textSecondary }
                              ]}>
                                {location.address}
                              </Text>
                            </View>
                            {location.is_primary && !isLocationSelected && (
                              <View style={styles.primaryBadge}>
                                <Text style={styles.primaryBadgeText}>Primary</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Add New Business Button */}
            <AppButton
              title="Add New Business"
              iconLeft="add"
              onPress={() => {
                closeProfileSwitcher();
                setTimeout(openAddBusinessOptions, 300);
              }}
              fullWidth
              style={styles.addNewBusinessButton}
            />
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  // Add Business Options Modal
  const renderAddBusinessOptionsModal = () => (
    <Modal
      transparent
      visible={isAddBusinessOptionsVisible}
      onRequestClose={closeAddBusinessOptions}
      animationType="none"
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: addOptionsOverlayOpacity }
        ]}
      >
        <TouchableOpacity
          style={styles.modalOverlayTouchable}
          activeOpacity={1}
          onPress={closeAddBusinessOptions}
        />

        <Animated.View
          style={[
            styles.addOptionsBottomSheet,
            {
              backgroundColor: appTheme.colors.surface,
              transform: [{ translateY: addOptionsModalTranslateY }]
            }
          ]}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>Add Business</Text>
            <TouchableOpacity onPress={closeAddBusinessOptions} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color={appTheme.colors.textLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.addOptionsContent}>
            <TouchableOpacity
              style={styles.addOptionRow}
              onPress={handleCreateNewBusiness}
            >
              <View style={[styles.addOptionIconContainer, { backgroundColor: appTheme.colors.surface }]}>
                <Icon name="add-circle-outline" size={24} color={appTheme.colors.primary} />
              </View>
              <View style={styles.addOptionInfo}>
                <Text style={[styles.addOptionTitle, { color: appTheme.colors.primary }]}>
                  Create New Business
                </Text>
                <Text style={[styles.addOptionSubtitle, { color: appTheme.colors.textSecondary }]}>
                  Start a new business from scratch
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addOptionRow}
              onPress={handleJoinBusiness}
            >
              <View style={[styles.addOptionIconContainer, { backgroundColor: appTheme.colors.surface }]}>
                <Icon name="people-outline" size={24} color={appTheme.colors.primary} />
              </View>
              <View style={styles.addOptionInfo}>
                <Text style={[styles.addOptionTitle, { color: appTheme.colors.primary }]}>
                  Join a Business
                </Text>
                <Text style={[styles.addOptionSubtitle, { color: appTheme.colors.textSecondary }]}>
                  Search and join an existing business
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderCoverImage()}
        {renderProfileSection()}
        {subscription && !isSubActive && (
          <SubscriptionWarningBanner
            status={subscription.status}
            daysRemaining={daysRemaining}
            onPress={() => (navigation as any).navigate('SubscriptionPlans')}
          />
        )}
        {renderTabBar()}
        {activeTab === 'products' ? renderProductsTab() : renderAboutTab()}
        <View style={{ height: theme.spacing.xl + 34 }} />
      </ScrollView>

      {/* Hero header — settings control pinned over the cover image (no back: tab root) */}
      <HeroHeader
        title={activeBusiness?.name ?? ''}
        rightActions={[{ icon: 'settings-outline', onPress: handleSettings, accessibilityLabel: 'Settings' }]}
      />

      {renderProfileSwitcherModal()}
      {renderAddBusinessOptionsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Cover image styles
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
  profileSection: {
    paddingHorizontal: 12,
    paddingTop: 16, // 16px gap between cover and profile picture
    paddingBottom: theme.spacing.md,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  businessName: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
  },
  dropdownArrow: {
    marginLeft: 8,
    marginTop: 2,
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
  editButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#1C1917',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
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
  tabItemActive: {},
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
  productsContainer: {
    paddingTop: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.bold,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  addButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // About tab styles
  aboutContainer: {
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalBottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    paddingHorizontal: 12,
    marginTop: 8,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  addBusinessButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ECE6DF',
  },
  profileRowActive: {
    backgroundColor: '#1C1917',
    borderRadius: 0,
    borderBottomWidth: 0,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  profileRowAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileRowName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  profileRowSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 2,
  },
  // Location styles
  locationsContainer: {
    // No left line, just a container for locations
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ECE6DF',
  },
  locationRowActive: {
    backgroundColor: '#1C1917',
    borderBottomWidth: 0,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  locationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  locationAddress: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  primaryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#34A853',
  },
  addNewBusinessButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  // Add Business Options Modal styles
  addOptionsBottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  addOptionsContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  addOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FAF8F5',
  },
  addOptionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addOptionTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  addOptionSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
});
