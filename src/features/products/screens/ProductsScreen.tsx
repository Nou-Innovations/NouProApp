import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Animated,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Product } from '@/shared/data/mockProducts';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import BrandCard from '@/features/brands/components/BrandCard';
import ProductCard from '@/features/products/components/ProductCard';
import LocationDropdown from '@/features/company/components/LocationDropdown';
import DropdownModal, { DropdownItem } from '@/shared/components/ui/DropdownModal';
import ProductActionsModal from '@/features/products/components/ProductActionsModal';
import ProductCreateModal from '@/features/products/components/ProductCreateModal';
import PaywallModal from '@/features/subscription/components/PaywallModal';
import { Icon } from '@/shared/utils/icons';
import AppButton from '@/shared/components/ui/AppButton';
import IconButton from '@/shared/components/ui/IconButton';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import SimpleHeader, { AnimatedFlatList, HEADER_HEIGHT } from '@/shared/components/layout/headers/SimpleHeader';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useCompanyStore } from '@/shared/store/companyStore';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  canViewProducts,
  canEditProducts,
  canPublishProducts,
  checkPaywall,
} from '@/shared/utils/permissions';
import { useProducts, DisplayBrand } from '../hooks/useProducts';
import { 
  UIProduct, 
  UIProductStatus, 
  ProductViewType,
  UI_PRODUCT_STATUSES,
  PRODUCT_VIEW_TYPES,
} from '@/shared/types/product';

// Define list item types for FlatList data
type ListItem = 
  | { type: 'brand'; data: DisplayBrand }
  | { type: 'product'; data: UIProduct };

const ProductsScreen: React.FC = () => {
  // Use profileStore for role checks (single source of truth)
  const isAdmin = useProfileStore((state) => state.isAdmin);
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const { currentCompany, currentLocation } = useCompanyStore();
  
  // Profile store for RBAC
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  
  // Permission checks
  const hasViewPermission = canViewProducts(currentUserRole);
  const hasEditPermission = canEditProducts(currentUserRole);
  const canPublish = canPublishProducts(activeBusiness?.plan || null);

  // Use products hook for data
  const {
    products: sourceProducts,
    filteredBrands: visibleBrands,
    loading,
    refreshing,
    error,
    isMockData,
    statusFilter: selectedStatus,
    viewType: currentViewTitle,
    search: searchTerm,
    expandedBrand: expandedBrandName,
    setStatusFilter: setSelectedStatus,
    setViewType: setCurrentViewTitle,
    setSearch: setSearchTerm,
    toggleBrand: handleBrandPress,
    setExpandedBrand: setExpandedBrandName,
    refresh,
    updateProductLocal,
  } = useProducts();

  // Local UI state
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedProducts, setEditedProducts] = useState<Record<string, Partial<UIProduct>>>({});
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState<boolean>(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [paywallFeature, setPaywallFeature] = useState<string>('');
  const [headerTitleLayout, setHeaderTitleLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const listData: ListItem[] = useMemo(() => {
    const data: ListItem[] = [];
    visibleBrands.forEach(brand => {
      data.push({ type: 'brand', data: brand });
      if (brand.name === expandedBrandName) {
        let productsToShow = brand.products;
        productsToShow = productsToShow.filter(p =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          brand.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (selectedStatus !== 'All') {
          productsToShow = productsToShow.filter(p => p.status.toLowerCase() === selectedStatus.toLowerCase());
        }
        productsToShow.forEach(product => {
          data.push({ type: 'product', data: product });
        });
      }
    });
    return data;
  }, [visibleBrands, expandedBrandName, searchTerm, selectedStatus]);

  const toggleEditMode = () => {
    if (isEditing) {
      if (Object.keys(editedProducts).length > 0) {
         setShowSaveConfirmation(true);
      } else {
         setIsEditing(false);
         setEditedProducts({});
      }
    } else {
      setIsEditing(true);
      setEditedProducts({});
    }
  };

  const handleProductUpdate = useCallback((productId: string, field: keyof UIProduct, value: any) => {
    setEditedProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  }, []);
  
  const handleConfirmSave = () => {
    // Apply edits to local state via hook
    Object.entries(editedProducts).forEach(([productId, updates]) => {
      updateProductLocal(productId, updates);
    });
    setIsEditing(false);
    setEditedProducts({});
    setShowSaveConfirmation(false);
    setShowSuccessDialog(true);
  };

  const handleDiscardChanges = () => {
    setIsEditing(false);
    setEditedProducts({});
    setShowSaveConfirmation(false);
  };

  const handleCancelSaveDialog = () => {
    setShowSaveConfirmation(false);
  };
  
  const renderListItem = useCallback(({ item }: { item: ListItem }) => {
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
      const editedData = editedProducts[item.data.id] || {};
      const currentProductData = { ...item.data, ...editedData };
      return (
        <ProductCard 
          product={currentProductData} 
          isEditing={isEditing}
          onPress={() => handleProductPress(item.data.id)}
          onUpdate={(field, value) => handleProductUpdate(item.data.id, field, value)}
          onPublishToggle={handlePublishToggle}
          showPublishToggle={isEditing && canPublish}
        />
      );
    }
  }, [expandedBrandName, handleBrandPress, isEditing, editedProducts, handleProductUpdate, handlePublishToggle, canPublish]);

  const keyExtractor = useCallback((item: ListItem) => {
     return item.type === 'brand' ? `brand-${item.data.name}` : `product-${item.data.id}`;
  }, []);

  const handleOpenCreateOptions = () => {
    setShowCreateModal(true);
  };

  const handleSelectProductView = (view: string) => {
    setCurrentViewTitle(view as ProductViewType);
    setExpandedBrandName(null);
  };

  const handleCreateProduct = () => {
    navigation.navigate('CreateProduct' as never);
  };

  const handleCreateBrand = () => {
    navigation.navigate('CreateBrand' as never);
  };

  const handleEditMode = () => {
    toggleEditMode();
  };

  const toggleViewDropdown = () => {
    setShowViewDropdown(!showViewDropdown);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status as UIProductStatus | 'All');
  };

  const handleLocationSelect = (item: DropdownItem) => {
    const locationId = item.id === 'all' ? null : item.id;
    setSelectedLocationId(locationId);
  };

  const handleProductPress = (productId: string) => {
    (navigation as any).navigate('ProductDetail', { productId });
  };

  // Handle publish toggle with paywall check
  const handlePublishToggle = useCallback((productId: string, currentPublishState: boolean) => {
    // Only check paywall when trying to publish (not unpublish)
    if (!currentPublishState && !canPublish) {
      // Check paywall
      const paywallCheck = checkPaywall('publish_product', activeBusiness?.plan || null);
      if (!paywallCheck.allowed) {
        setPaywallFeature('publishing products');
        setShowPaywall(true);
        return;
      }
    }
    
    // Toggle publish state
    handleProductUpdate(productId, 'isDisplayable', !currentPublishState);
  }, [canPublish, activeBusiness?.plan, handleProductUpdate]);

  // Check user permissions for global vs location-scoped access
  const canViewAllProducts = isAdmin();

  // Create location dropdown items
  const locationItems: DropdownItem[] = useMemo(() => {
    const items: DropdownItem[] = [];
    
    // Always add "All Locations" option
    items.push({
      id: 'all',
      title: 'All Locations',
      icon: 'grid',
    });
    
    // Add company locations
    if (currentCompany?.locations) {
      currentCompany.locations.forEach(location => {
        items.push({
          id: location.id,
          title: location.name,
          icon: 'location',
        });
      });
    }
    
    return items;
  }, [currentCompany?.locations]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SimpleHeader
        headerComponent={
          <PrimaryHeader
            title={currentViewTitle}
            onTitlePress={toggleViewDropdown}
            actions={[
              { icon: 'plus', onPress: handleOpenCreateOptions, accessibilityLabel: 'Create product' },
              ...((isEditing || isAdmin()) ? [{
                icon: isEditing ? 'save' : 'pencil',
                onPress: toggleEditMode,
                accessibilityLabel: isEditing ? 'Save changes' : 'Edit products',
              }] : []),
            ]}
          />
        }
        searchComponent={
          <View style={{ backgroundColor: appTheme.colors.background }}>
            {/* Location Selector Section */}
            <View style={styles.locationSection}>
              <TouchableOpacity 
                style={[styles.locationDropdown, { 
                  borderColor: appTheme.colors.borderColor,
                  backgroundColor: appTheme.colors.background
                }]}
                onPress={() => setShowLocationDropdown(true)}
              >
                <Text style={[styles.locationText, { 
                  color: appTheme.colors.textSecondary 
                }]}>
                  {selectedLocationId ? 
                    currentCompany?.locations?.find(l => l.id === selectedLocationId)?.name || 'All Locations' 
                    : 'All Locations'}
                </Text>
                <Icon name="chevron-down" size={16} color={appTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <AppSearchBar
                placeholder="Search brands…" 
                value={searchTerm}
                onChangeText={setSearchTerm}
                onClear={() => setSearchTerm('')}
                containerStyle={styles.searchBarContainer}
              />
            </View>
          </View>
        }
        stickyComponent={
          <FilterBar 
            statuses={UI_PRODUCT_STATUSES}
            selectedStatus={selectedStatus}
            onSelectStatus={handleStatusChange}
            containerStyle={{ flexGrow: 0 }}
          />
        }
      >
        <AnimatedFlatList
          data={listData}
          renderItem={renderListItem as any}
          keyExtractor={keyExtractor as any}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={appTheme.colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* Dev mode mock data indicator */}
              {__DEV__ && isMockData && (
                <View style={[styles.mockDataBanner, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ color: '#92400E', fontSize: 12 }}>Using mock data (API unavailable)</Text>
                </View>
              )}
              
              {/* Loading state */}
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={appTheme.colors.primary} />
                </View>
              )}
              
              {/* Error state */}
              {error && !loading && (
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
                  <TouchableOpacity onPress={refresh} style={[styles.retryButton, { backgroundColor: appTheme.colors.primary }]}>
                    <Text style={{ color: 'white' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyListComponent}>
              <Text style={styles.emptyListText}>No brands or products found</Text>
            </View>
          )}
          contentContainerStyle={{
            // paddingTop: HEADER_HEIGHT, // Removed - SimpleHeader handles this automatically
          }}
          style={{ flex: 1 }}
          extraData={{ editMode: isEditing, expandedBrand: expandedBrandName, edits: editedProducts, currentView: currentViewTitle }}
        />
      </SimpleHeader>

      {/* View Selection Modal (View Dropdown) */}
      <ProductActionsModal
        visible={showViewDropdown}
        onClose={() => setShowViewDropdown(false)}
        selectedView={currentViewTitle}
        onSelectView={handleSelectProductView}
      />

      {/* Location Selection Modal */}
      <DropdownModal
        visible={showLocationDropdown}
        onClose={() => setShowLocationDropdown(false)}
        title="Locations"
        items={locationItems}
        selectedItemId={selectedLocationId || 'all'}
        onSelectItem={handleLocationSelect}
      />

      {/* Create Actions Bottom Sheet Modal (+ button) */}
      <ProductCreateModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateProduct={handleCreateProduct}
        onCreateBrand={handleCreateBrand}
        onEditMode={handleEditMode}
        showEditMode={isAdmin()}
      />
      
      {/* Save Confirmation Modal */}
      <ConfirmationDialog
        visible={showSaveConfirmation}
        variant="confirm"
        title="Unsaved Changes"
        message="Would you like to save your changes?"
        primaryButtonText="Save Changes"
        secondaryButtonText="Discard Changes"
        onPrimaryAction={handleConfirmSave}
        onSecondaryAction={handleDiscardChanges}
        onClose={handleCancelSaveDialog}
      />

      {/* Success Dialog */}
      <ConfirmationDialog
        visible={showSuccessDialog}
        variant="success"
        title="Success"
        message="Changes saved successfully!"
        primaryButtonText="OK"
        onPrimaryAction={() => setShowSuccessDialog(false)}
        onClose={() => setShowSuccessDialog(false)}
      />

      {/* Paywall Modal for Free Plan Users */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          (navigation as any).navigate('Subscription');
        }}
        requiredPlan="pro"
        featureName={paywallFeature}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 0,
  },
  searchBarContainer: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 8,
  },
  emptyListComponent: {
    marginTop: 40,
    alignItems: 'center',
    flex: 1,
  },
  emptyListText: {
    color: '#6B7280',
    fontSize: 16,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 8,
  },
  locationDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 0,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  locationContext: {
    fontSize: 12,
    marginTop: 4,
    marginHorizontal: 8,
  },

  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 48,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 32,
  },
  dropdownArrow: {
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockDataBanner: {
    padding: 8,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
}); 

export default ProductsScreen; 