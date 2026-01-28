import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import DeliveryCard from '@/features/deliveries/components/DeliveryCard';
import LocationDropdown from '@/features/company/components/LocationDropdown';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import DeliveryActionsModal from '@/features/deliveries/components/DeliveryActionsModal';
import DeliveryCreateModal from '@/features/deliveries/components/DeliveryCreateModal';
import PaywallModal from '@/features/subscription/components/PaywallModal';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import { Icon } from '@/shared/utils/icons';
import { EmptyState } from '@/shared/components/ui';
import {
  canViewDeliveries,
  canManageDeliveries,
  canUpdateDeliveryStatus,
  canCreateDeliveries,
  checkPaywall,
} from '@/shared/utils/permissions';
import { useDeliveries } from '../hooks/useDeliveries';
import { Delivery, DeliveryStatus, DeliveryViewType } from '@/shared/types/delivery';

// Status filter options (matching Prisma DeliveryStatus enum)
const DELIVERY_STATUSES: (DeliveryStatus | 'all')[] = [
  'all', 
  'NOT_ASSIGNED', 
  'ASSIGNED', 
  'PACKED', 
  'OUT_FOR_DELIVERY', 
  'DELIVERED', 
  'FAILED',
  'CANCELED'
];

export default function DeliveryScreen() {
  const navigation = useNavigation();
  const [showViewDropdown, setShowViewDropdown] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const { theme: appTheme } = useTheme();
  const { setDeliveriesUnreadCount, isItemViewed } = useNotifications();
  
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

  // Calculate unread count based on items not yet viewed
  const unviewedDeliveriesCount = useMemo(() => {
    return filteredDeliveries.filter(d => !isItemViewed(d.id)).length;
  }, [filteredDeliveries, isItemViewed]);

  // Update the deliveries unread count when component mounts or data changes
  useEffect(() => {
    setDeliveriesUnreadCount(unviewedDeliveriesCount);
  }, [unviewedDeliveriesCount, setDeliveriesUnreadCount]);

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
      {/* Primary Header */}
      <PrimaryHeader
        title={getTabTitle()}
        onTitlePress={toggleViewDropdown}
        actions={[
          { icon: 'plus', onPress: handleCreateNew, accessibilityLabel: 'Create delivery' },
        ]}
      />

      {/* Location Selector */}
      <View style={styles.locationSection}>
        <LocationDropdown 
          style={{ flex: 1 }}
          onLocationSelect={setSelectedLocationId}
          selectedLocationId={selectedLocationId}
        />
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
        <AppSearchBar
          placeholder="Search by Company or Order ID…"
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          containerStyle={styles.searchBarContainer}
        />
      </View>

      {/* Filter Bar */}
      <FilterBar 
        statuses={DELIVERY_STATUSES}
        selectedStatus={filter}
        onSelectStatus={setFilter}
        containerStyle={{ flexGrow: 0 }}
      />

      {/* Delivery List */}
      <FlatList
        data={loading ? [] : filteredDeliveries}
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
            {__DEV__ && isMockData && !loading && (
              <View style={[styles.mockDataBanner, { backgroundColor: '#FEF3C7' }]}>
                <Text style={{ color: '#92400E', fontSize: 12 }}>Using mock data (API unavailable)</Text>
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
        ListEmptyComponent={() => {
          if (loading) {
            return (
              <View style={styles.emptyListContainer}>
                <ActivityIndicator size="large" color={appTheme.colors.primary} />
                <Text style={[styles.emptyListText, { color: appTheme.colors.textLight, marginTop: 16 }]}>
                  Loading deliveries...
                </Text>
              </View>
            );
          }
          
          // Determine empty state content based on active tab
          const getEmptyStateContent = () => {
            switch (activeTab) {
              case 'outgoing':
                return {
                  icon: 'arrow-up-circle-outline',
                  title: 'No outgoing deliveries',
                  subtitle: 'Track shipments sent to your clients or partners.',
                  ctaLabel: 'Create outgoing delivery',
                };
              case 'incoming':
                return {
                  icon: 'arrow-down-circle-outline',
                  title: 'No incoming deliveries',
                  subtitle: 'Incoming deliveries from suppliers will appear here.',
                  ctaLabel: undefined,
                };
              case 'transfers':
                return {
                  icon: 'swap-horizontal-outline',
                  title: 'No transfers recorded',
                  subtitle: 'Internal stock or location transfers will appear here.',
                  ctaLabel: 'Create transfer',
                };
              default:
                return {
                  icon: 'car-outline',
                  title: 'No deliveries yet',
                  subtitle: 'All your incoming and outgoing deliveries will be listed here.',
                  ctaLabel: 'Create delivery',
                };
            }
          };
          
          const { icon, title, subtitle, ctaLabel } = getEmptyStateContent();
          
          return (
            <EmptyState
              iconName={icon}
              title={title}
              subtitle={selectedLocationId ? 'Try selecting "All Locations" to see more.' : subtitle}
              ctaLabel={hasManagePermission ? ctaLabel : undefined}
              onCtaPress={hasManagePermission ? handleCreateNew : undefined}
              testID="empty-deliveries"
            />
          );
        }}
        contentContainerStyle={filteredDeliveries.length === 0 ? { flex: 1 } : { flexGrow: 1 }}
        style={{ flex: 1 }}
      />

      {/* Delivery Type Selection Modal (View Dropdown) */}
      <DeliveryActionsModal
        visible={showViewDropdown}
        onClose={() => setShowViewDropdown(false)}
        selectedView={activeTab}
        onSelectView={handleSelectView}
      />

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