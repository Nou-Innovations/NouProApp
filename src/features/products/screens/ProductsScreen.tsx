import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Product } from '@/shared/data/mockProducts';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import BrandCard from '@/features/brands/components/BrandCard';
import ProductCard from '@/features/products/components/ProductCard';
import LocationDropdown from '@/features/company/components/LocationDropdown';
import ProductActionsModal from '@/features/products/components/ProductActionsModal';
import ProductCreateModal from '@/features/products/components/ProductCreateModal';
import PaywallModal from '@/features/subscription/components/PaywallModal';
import AppButton from '@/shared/components/ui/AppButton';
import IconButton from '@/shared/components/ui/IconButton';
import { AppModal } from '@/shared/components/ui';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { EmptyState } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  canViewProducts,
  canEditProducts,
  canPublishProducts,
  checkPaywall,
  PaywallCheck,
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
  const { currentCompany } = useBusinessStore();
  
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
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedProducts, setEditedProducts] = useState<Record<string, Partial<UIProduct>>>({});
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [paywallCheckResult, setPaywallCheckResult] = useState<PaywallCheck | null>(null);
  const hasEditedProducts = Object.keys(editedProducts).length > 0;

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

  // Handle publish toggle with paywall check (must be defined before renderListItem)
  const handlePublishToggle = useCallback((productId: string, currentPublishState: boolean) => {
    // Only check paywall when trying to publish (not unpublish)
    if (!currentPublishState && !canPublish) {
      // Check paywall using new trigger ID
      const check = checkPaywall('publish_business_page', activeBusiness?.plan || null);
      if (!check.allowed) {
        setPaywallCheckResult(check);
        setShowPaywall(true);
        return;
      }
    }
    
    // Toggle publish state
    handleProductUpdate(productId, 'isDisplayable', !currentPublishState);
  }, [canPublish, activeBusiness?.plan, handleProductUpdate]);
  
  const renderListItem = useCallback(({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === 'brand') {
      return (
        <BrandCard 
          brandName={item.data.name}
          brandLogo={item.data.logo}
          productCount={item.data.productCount}
          isExpanded={expandedBrandName === item.data.name}
          isFirst={index === 0}
          onPress={() => handleBrandPress(item.data.name)}
        />
      );
    } else {
      const editedData = editedProducts[item.data.id] || {};
      const currentProductData = { ...item.data, ...editedData };
      const nextItem = listData[index + 1];
      const isLastProduct = !nextItem || nextItem.type === 'brand';
      return (
        <ProductCard 
          product={currentProductData} 
          isEditing={isEditing}
          onPress={() => handleProductPress(item.data.id)}
          onUpdate={(field, value) => handleProductUpdate(item.data.id, field, value)}
          onPublishToggle={handlePublishToggle}
          showPublishToggle={isEditing && canPublish}
          isLastProduct={isLastProduct}
        />
      );
    }
  }, [expandedBrandName, handleBrandPress, isEditing, editedProducts, handleProductUpdate, handlePublishToggle, canPublish, listData]);

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

  const handleProductPress = (productId: string) => {
    (navigation as any).navigate('ProductDetail', { productId });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      {/* Primary Header */}
      <PrimaryHeader
        title={currentViewTitle}
        onTitlePress={toggleViewDropdown}
        actions={[
          { icon: 'plus', onPress: handleOpenCreateOptions, accessibilityLabel: 'Create product' },
          ...((isEditing || isAdmin()) ? [{
            icon: isEditing ? 'save' : 'pencil',
            onPress: toggleEditMode,
            accessibilityLabel: isEditing ? 'Save changes' : 'Edit products',
            iconColor: isEditing && hasEditedProducts ? appTheme.colors.success : undefined,
          }] : []),
        ]}
      />

      {/* Location Selector */}
      <View style={styles.locationSection}>
        <LocationDropdown style={{ flex: 1 }} />
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
        <AppSearchBar
          placeholder="Search brands…" 
          value={searchTerm}
          onChangeText={setSearchTerm}
          onClear={() => setSearchTerm('')}
          containerStyle={styles.searchBarContainer}
        />
      </View>

      {/* Filter Bar */}
      <FilterBar 
        statuses={UI_PRODUCT_STATUSES}
        selectedStatus={selectedStatus}
        onSelectStatus={handleStatusChange}
        containerStyle={{ flexGrow: 0 }}
      />

      {/* Product List */}
      <FlatList
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
        ListEmptyComponent={() => {
          // Determine empty state content based on view type
          const getEmptyStateContent = () => {
            switch (currentViewTitle) {
              case 'My Products':
                return {
                  icon: 'cube-outline',
                  title: "You haven't added any products",
                  subtitle: 'Create your own products to manage stock and sales.',
                  ctaLabel: 'Create product',
                };
              case 'Imported':
                return {
                  icon: 'download-outline',
                  title: 'No imported products',
                  subtitle: 'Products imported from partners will appear here.',
                  ctaLabel: 'Import products',
                };
              case 'Displayed':
                return {
                  icon: 'eye-outline',
                  title: 'No products on display',
                  subtitle: 'Display products to make them visible to other businesses.',
                  ctaLabel: 'Display products',
                };
              default:
                return {
                  icon: 'cube-outline',
                  title: 'No products yet',
                  subtitle: 'Products you manage or interact with will appear here.',
                  ctaLabel: 'Add product',
                };
            }
          };
          
          const { icon, title, subtitle, ctaLabel } = getEmptyStateContent();
          
          return (
            <EmptyState
              iconName={icon}
              title={title}
              subtitle={subtitle}
              ctaLabel={hasEditPermission ? ctaLabel : undefined}
              onCtaPress={hasEditPermission ? handleOpenCreateOptions : undefined}
              testID="empty-products"
            />
          );
        }}
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ flex: 1 }}
        extraData={{ editMode: isEditing, expandedBrand: expandedBrandName, edits: editedProducts, currentView: currentViewTitle }}
      />

      {/* View Selection Modal (View Dropdown) */}
      <ProductActionsModal
        visible={showViewDropdown}
        onClose={() => setShowViewDropdown(false)}
        selectedView={currentViewTitle}
        onSelectView={handleSelectProductView}
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
      
      {/* Save Confirmation Dialog */}
      <AppModal
        visible={showSaveConfirmation}
        onClose={handleCancelSaveDialog}
        variant="confirm"
        title="Unsaved Changes"
        message="Would you like to save your changes?"
        primaryButtonText="Save Changes"
        onPrimaryAction={handleConfirmSave}
        secondaryButtonText="Discard"
        onSecondaryAction={handleDiscardChanges}
      />

      {/* Success Dialog */}
      <AppModal
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        variant="success"
        title="Success"
        message="Changes saved successfully!"
        primaryButtonText="OK"
        onPrimaryAction={() => setShowSuccessDialog(false)}
      />

      {/* Paywall Modal for Free Plan Users */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          (navigation as any).navigate('SubscriptionPlans');
        }}
        requiredPlan={paywallCheckResult?.requiredPlan || 'pro'}
        modalType={paywallCheckResult?.modalType}
        title={paywallCheckResult?.title}
        description={paywallCheckResult?.description}
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