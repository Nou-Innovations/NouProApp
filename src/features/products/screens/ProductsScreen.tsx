import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/shared/components/ui/FilterBar';
import BrandCard from '@/features/brands/components/BrandCard';
import ProductCard from '@/features/products/components/ProductCard';
import LocationDropdown from '@/shared/components/ui/LocationDropdown';
import ProductActionsModal from '@/features/products/components/ProductActionsModal';
import ProductCreateModal from '@/features/products/components/ProductCreateModal';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import AppButton from '@/shared/components/ui/AppButton';
import IconButton from '@/shared/components/ui/IconButton';
import { AppModal, AppBottomSheet, ListItemCard , EmptyState, Skeleton, SkeletonRow, SkeletonColumn } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  canViewProducts,
  canEditProducts,
  checkPaywall,
  getLimitTriggerId,
  PaywallCheck,
} from '@/shared/utils/permissions';
import { useProducts, DisplayBrand } from '../hooks/useProducts';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/shared/constants/categories';
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
  const currentCompany = useBusinessStore((state) => state.currentCompany);
  
  // Profile store for RBAC
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  
  // Permission checks
  const hasViewPermission = canViewProducts(currentUserRole);
  const hasEditPermission = canEditProducts(currentUserRole);

  // Use products hook for data
  const {
    products: sourceProducts,
    filteredBrands: visibleBrands,
    loading,
    refreshing,
    error,
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
    updateProductServer,
  } = useProducts();

  // Local UI state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editedProducts, setEditedProducts] = useState<Record<string, Partial<UIProduct>>>({});
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [paywallCheckResult, setPaywallCheckResult] = useState<PaywallCheck | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
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
        if (selectedCategory) {
          productsToShow = productsToShow.filter(p => p.category === selectedCategory);
        }
        productsToShow.forEach(product => {
          data.push({ type: 'product', data: product });
        });
      }
    });
    return data;
  }, [visibleBrands, expandedBrandName, searchTerm, selectedStatus, selectedCategory]);

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
  
  const handleConfirmSave = async () => {
    setIsSaving(true);
    setShowSaveConfirmation(false);

    // Apply edits locally first (optimistic update)
    Object.entries(editedProducts).forEach(([productId, updates]) => {
      updateProductLocal(productId, updates);
    });

    // Persist to server
    const entries = Object.entries(editedProducts);
    const errors: string[] = [];
    for (const [productId, updates] of entries) {
      try {
        await updateProductServer(productId, updates);
      } catch (err: any) {
        errors.push(err?.message || `Failed to update product ${productId}`);
      }
    }

    setIsEditing(false);
    setEditedProducts({});
    setIsSaving(false);

    if (errors.length > 0) {
      // Re-fetch from server to correct the optimistic state
      refresh();
      Alert.alert(
        'Save Partially Failed',
        `${errors.length} of ${entries.length} product update(s) failed. The list has been refreshed from the server.`,
        [{ text: 'OK' }]
      );
    } else {
      setShowSuccessDialog(true);
    }
  };

  const handleDiscardChanges = () => {
    setIsEditing(false);
    setEditedProducts({});
    setShowSaveConfirmation(false);
  };

  const handleCancelSaveDialog = () => {
    setShowSaveConfirmation(false);
  };

  // Handle listed toggle with limit check (must be defined before renderListItem)
  const handlePublishToggle = useCallback((productId: string, currentListedState: boolean) => {
    // Only check limit when trying to list (not unlist)
    if (!currentListedState) {
      const listedCount = sourceProducts.filter(p => p.isListed || p.is_listed || p.isDisplayable).length;
      const triggerId = getLimitTriggerId('products', activeBusiness?.plan || null);
      if (triggerId) {
        const check = checkPaywall(triggerId, activeBusiness?.plan || null, { currentCount: listedCount });
        if (!check.allowed) {
          setPaywallCheckResult(check);
          setShowPaywall(true);
          return;
        }
      }
    }

    // Toggle listed state
    handleProductUpdate(productId, 'isListed', !currentListedState);
  }, [sourceProducts, activeBusiness?.plan, handleProductUpdate]);
  
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
          showPublishToggle={isEditing}
          isLastProduct={isLastProduct}
        />
      );
    }
  }, [expandedBrandName, handleBrandPress, isEditing, editedProducts, handleProductUpdate, handlePublishToggle, listData]);

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
      <SecondaryHeader
        title={currentViewTitle}
        onTitlePress={toggleViewDropdown}
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
        rightActions={[
          { icon: 'plus', onPress: handleOpenCreateOptions, accessibilityLabel: 'Create product' },
          ...((isEditing || isAdmin()) ? [{
            icon: isSaving ? 'time' : (isEditing ? 'save' : 'pencil'),
            onPress: isSaving ? undefined : toggleEditMode,
            accessibilityLabel: isSaving ? 'Saving...' : (isEditing ? 'Save changes' : 'Edit products'),
            iconColor: isEditing && hasEditedProducts ? appTheme.colors.success : undefined,
            disabled: isSaving,
          }] : []),
        ]}
      />

      {/* Location Selector */}
      <View style={styles.locationSection}>
        <LocationDropdown style={{ flex: 1 }} />
      </View>

      {/* Category Filter */}
      <View style={styles.locationSection}>
        <TouchableOpacity
          style={[
            styles.categoryDropdown,
            {
              borderColor: appTheme.colors.borderColor,
              backgroundColor: appTheme.colors.background,
            },
          ]}
          onPress={() => setShowCategoryModal(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.categoryDropdownText,
              { color: selectedCategory ? appTheme.colors.text : appTheme.colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {selectedCategory ? getCategoryLabel(selectedCategory) : 'All Categories'}
          </Text>
          <View style={styles.categoryChevron}>
            {selectedCategory && (
              <TouchableOpacity
                onPress={() => setSelectedCategory(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginRight: 4 }}
              >
                <Text style={{ color: appTheme.colors.textSecondary, fontSize: 14 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
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
            {/* Loading skeleton */}
            {loading && (
              <View style={{ paddingVertical: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={i}>
                    {/* Brand card skeleton */}
                    <SkeletonRow gap={12} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                      <Skeleton width={48} height={48} borderRadius={8} />
                      <SkeletonColumn gap={6} style={{ flex: 1 }}>
                        <Skeleton width="50%" height={16} />
                        <Skeleton width="30%" height={13} />
                      </SkeletonColumn>
                      <Skeleton width={20} height={20} borderRadius={4} />
                    </SkeletonRow>
                    {/* Product row skeletons (first brand expanded) */}
                    {i === 0 && Array.from({ length: 2 }).map((_, j) => (
                      <SkeletonRow key={j} gap={12} style={{ paddingHorizontal: 16, paddingVertical: 10, paddingLeft: 32 }}>
                        <Skeleton width={64} height={64} borderRadius={8} />
                        <SkeletonColumn gap={5} style={{ flex: 1 }}>
                          <Skeleton width="60%" height={14} />
                          <Skeleton width="40%" height={12} />
                          <Skeleton width="30%" height={12} />
                        </SkeletonColumn>
                      </SkeletonRow>
                    ))}
                  </View>
                ))}
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
              case 'Display':
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
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        extraData={{ editMode: isEditing, expandedBrand: expandedBrandName, edits: editedProducts, currentView: currentViewTitle }}
      />

      {/* Category Selection Modal */}
      <AppBottomSheet
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Filter by Category"
      >
        <ListItemCard
          key="all"
          avatar={{
            type: 'icon',
            icon: 'grid-outline',
            iconColor: !selectedCategory ? appTheme.colors.primary : appTheme.colors.text,
            backgroundColor: appTheme.colors.surface,
          }}
          title="All Categories"
          onPress={() => {
            setSelectedCategory(null);
            setShowCategoryModal(false);
          }}
          selected={!selectedCategory}
          showCheckmark
          showDivider
        />
        {BUSINESS_CATEGORIES.map((cat, index) => (
          <ListItemCard
            key={cat.id}
            avatar={{
              type: 'icon',
              icon: cat.icon,
              iconColor: selectedCategory === cat.id ? appTheme.colors.primary : appTheme.colors.text,
              backgroundColor: appTheme.colors.surface,
            }}
            title={cat.label}
            onPress={() => {
              setSelectedCategory(cat.id);
              setShowCategoryModal(false);
            }}
            selected={selectedCategory === cat.id}
            showCheckmark
            showDivider={index < BUSINESS_CATEGORIES.length - 1}
          />
        ))}
      </AppBottomSheet>

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
    color: '#57534E',
    fontSize: 16,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 8,
  },
  categoryDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
  },
  categoryDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  categoryChevron: {
    flexDirection: 'row',
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