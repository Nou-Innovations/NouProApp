import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import DeliveryCard from '@/features/deliveries/components/DeliveryCard';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import SimpleHeader, { AnimatedFlatList } from '@/shared/components/layout/headers/SimpleHeader';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';
import DeliveryActionsModal from '@/features/deliveries/components/DeliveryActionsModal';
import DeliveryCreateModal from '@/features/deliveries/components/DeliveryCreateModal';
import PaywallModal from '@/features/subscription/components/PaywallModal';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProfileStore } from '@/shared/store/profileStore';
import { Icon } from '@/shared/utils/icons';
import {
  canViewDeliveries,
  canManageDeliveries,
  canUpdateDeliveryStatus,
  canCreateDeliveries,
  checkPaywall,
} from '@/shared/utils/permissions';
import { useDeliveries } from '../hooks/useDeliveries';
import { Delivery, DeliveryStatus, DeliveryViewType } from '@/shared/types/delivery';

// Status filter options
const DELIVERY_STATUSES: (DeliveryStatus | 'all')[] = ['all', 'new', 'pending', 'ongoing', 'delivered', 'canceled'];

export default function DeliveryScreen() {
  const navigation = useNavigation();
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const { theme: appTheme } = useTheme();
  const { setDeliveriesUnreadCount } = useNotifications();
  const { currentCompany, currentLocation, locations, setLocation } = useBusinessStore();
  
  // Profile store for RBAC (single source of truth)
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const currentStaffRoleType = useProfileStore((state) => state.currentStaffRoleType);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const isAdmin = useProfileStore((state) => state.isAdmin);
  
  // Permission checks
  const hasViewPermission = canViewDeliveries(currentUserRole, currentStaffRoleType ?? undefined);
  const hasManagePermission = canManageDeliveries(currentUserRole);
  const canUpdateStatus = canUpdateDeliveryStatus(currentUserRole, currentStaffRoleType ?? undefined);
  const planAllowsDeliveries = canCreateDeliveries(activeBusiness?.plan || null);

  // Get business ID
  const businessId = activeBusiness?.id || 'biz-001';

  // Use deliveries hook for data
  const {
    filteredDeliveries,
    loading,
    refreshing,
    error,
    isMockData,
    statusFilter,
    viewType: activeTab,
    search,
    selectedLocationId,
    newDeliveriesCount,
    setStatusFilter,
    setViewType: setActiveTab,
    setSearch,
    setSelectedLocationId,
    refresh,
  } = useDeliveries();

  // Alias for filter state
  const filter = statusFilter;
  const setFilter = (value: string) => setStatusFilter(value as DeliveryStatus | 'all');

  // Update the deliveries unread count when component mounts or data changes
  useEffect(() => {
    setDeliveriesUnreadCount(newDeliveriesCount);
  }, [newDeliveriesCount, setDeliveriesUnreadCount]);

  const handleLocationSelect = (item: { id: string }) => {
    const locationId = item.id === 'all' ? null : item.id;
    setSelectedLocationId(locationId);
    setShowLocationDropdown(false);
  };

  // Check user permissions for global vs location-scoped access
  const canViewAllDeliveries = isAdmin();

  // Check if business has only one location (with defensive check for undefined/null)
  const safeLocations = Array.isArray(locations) ? locations : [];
  const hasSingleLocation = safeLocations.length === 1;
  const primaryLocation = safeLocations.find(loc => (loc as any).is_primary) || safeLocations[0];

  // Auto-select primary location when there's only one
  useEffect(() => {
    if (hasSingleLocation && primaryLocation && !currentLocation) {
      setLocation(primaryLocation);
    }
  }, [hasSingleLocation, primaryLocation?.id, currentLocation]);

  // Create location dropdown items using business store locations
  const locationItems = useMemo(() => {
    const items: { id: string; title: string; icon: string }[] = [];
    
    // Only add "All Locations" option if there are multiple locations
    if (!hasSingleLocation) {
      items.push({
        id: 'all',
        title: 'All Locations',
        icon: 'grid',
      });
    }
    
    // Add business locations from store
    safeLocations.forEach(location => {
      items.push({
        id: location.id,
        title: location.name,
        icon: 'location',
      });
    });
    
    return items;
  }, [safeLocations, hasSingleLocation]);

  const handleCreateNew = () => {
    if (!hasManagePermission) {
      Alert.alert('Access Denied', 'Only admins can create new deliveries.');
      return;
    }
    
    // Check if plan allows deliveries
    if (!planAllowsDeliveries) {
      const paywallCheck = checkPaywall('create_delivery', activeBusiness?.plan || null);
      if (!paywallCheck.allowed) {
        setShowPaywall(true);
        return;
      }
    }
    
    setShowCreateModal(true);
  };

  const handleSelectView = (view: DeliveryViewType) => {
    setActiveTab(view);
    // Reset filters when changing view
    setFilter('all');
  };

  const handleCreateDelivery = () => {
    setShowCreateModal(false);
    // Navigate to CreateDelivery screen
    (navigation as any).navigate('CreateDelivery', { mode: 'delivery' });
  };

  const handleCreateTransfer = () => {
    setShowCreateModal(false);
    // Navigate to CreateDelivery screen with transfer mode
    (navigation as any).navigate('CreateDelivery', { mode: 'transfer' });
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'all': return 'All';
      case 'outgoing': return 'Outgoing';
      case 'incoming': return 'Incoming';
      case 'transfers': return 'Transfers';
      default: return 'All';
    }
  };

  const toggleViewDropdown = () => {
    setShowViewDropdown(!showViewDropdown);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SimpleHeader
        headerComponent={
          <PrimaryHeader
            title={getTabTitle()}
            onTitlePress={toggleViewDropdown}
            actions={[
              { icon: 'plus', onPress: handleCreateNew, accessibilityLabel: 'Create delivery' },
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
                onPress={() => !hasSingleLocation && setShowLocationDropdown(true)}
                disabled={hasSingleLocation}
                activeOpacity={hasSingleLocation ? 1 : 0.7}
              >
                <Text style={[styles.locationText, { 
                  color: appTheme.colors.textSecondary 
                }]}>
                  {hasSingleLocation && primaryLocation
                    ? primaryLocation.name
                    : selectedLocationId 
                      ? safeLocations.find(l => l.id === selectedLocationId)?.name || 'All Locations' 
                      : 'All Locations'}
                </Text>
                {!hasSingleLocation && (
                  <Icon name="chevron-down" size={16} color={appTheme.colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
            
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <AppSearchBar
                placeholder="Search by Company or Order ID…"
                value={search}
                onChangeText={setSearch}
                onClear={() => setSearch('')}
                containerStyle={styles.searchBarContainer}
              />
            </View>
          </View>
        }
        stickyComponent={
          <FilterBar 
            statuses={DELIVERY_STATUSES}
            selectedStatus={filter}
            onSelectStatus={setFilter}
            containerStyle={{ flexGrow: 0 }}
          />
        }
      >
        <AnimatedFlatList
          data={filteredDeliveries}
          keyExtractor={(item: unknown) => (item as Delivery).id}
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
          renderItem={({ item }: { item: unknown }) => (
            <DeliveryCard 
              delivery={item as Delivery} 
              isUserAdmin={hasManagePermission} 
              onPress={() => (navigation as any).navigate('DeliveryDetail', { deliveryId: (item as Delivery).id })}
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyListContainer}>
              <Icon 
                name={activeTab === 'incoming' ? 'arrow-down-circle-outline' : activeTab === 'outgoing' ? 'arrow-up-circle-outline' : 'car-outline'} 
                size={48} 
                color={appTheme.colors.textLight} 
              />
              <Text style={[styles.emptyListText, { color: appTheme.colors.textLight }]}>
                No {activeTab === 'all' ? 'deliveries' : activeTab === 'transfers' ? 'transfers' : `${activeTab} deliveries`} found
              </Text>
              {selectedLocationId && (
                <Text style={[styles.emptyListSubtext, { color: appTheme.colors.textLight }]}>
                  Try selecting "All Locations" to see more
                </Text>
              )}
            </View>
          )}
          contentContainerStyle={filteredDeliveries.length === 0 ? { flex: 1 } : {}}
          style={{ flex: 1 }}
        />
      </SimpleHeader>

      {/* Delivery Type Selection Modal (View Dropdown) */}
      <DeliveryActionsModal
        visible={showViewDropdown}
        onClose={() => setShowViewDropdown(false)}
        selectedView={activeTab}
        onSelectView={handleSelectView}
      />

      {/* Location Selection Modal */}
      <AppBottomSheet
        visible={showLocationDropdown}
        onClose={() => setShowLocationDropdown(false)}
        title="Locations"
      >
        <View style={{ gap: 8 }}>
          {locationItems.map((item) => {
            const isSelected = (selectedLocationId || 'all') === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 60,
                  paddingHorizontal: 8,
                  borderBottomWidth: 0.5,
                  borderBottomColor: appTheme.colors.borderColor,
                }}
                onPress={() => handleLocationSelect(item)}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: appTheme.colors.inputBackgroundAlt,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Icon
                    name={item.icon}
                    size={24}
                    color={isSelected ? appTheme.colors.primary : appTheme.colors.iconMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: isSelected ? appTheme.colors.primary : appTheme.colors.text,
                  }}>
                    {item.title}
                  </Text>
                </View>
                {isSelected && (
                  <Icon name="checkmark" size={20} color={appTheme.colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </AppBottomSheet>

      {/* Create Actions Bottom Sheet Modal (+ button) */}
      <DeliveryCreateModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateDelivery={handleCreateDelivery}
        onCreateTransfer={handleCreateTransfer}
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
        featureName="creating deliveries"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 48,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 0,
    marginTop: 0,
  },
  dropdownArrow: {
    marginLeft: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical:0,
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
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: 12,
  },
  newOrdersInfo: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyListContainer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyListText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyListSubtext: {
    fontSize: 14,
    textAlign: 'center',
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