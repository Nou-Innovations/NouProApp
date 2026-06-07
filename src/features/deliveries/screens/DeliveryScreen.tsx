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
import FilterBar from '@/shared/components/ui/FilterBar';
import DeliveryCard from '@/features/deliveries/components/DeliveryCard';
import LocationDropdown from '@/shared/components/ui/LocationDropdown';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import DeliveryActionsModal from '@/features/deliveries/components/DeliveryActionsModal';
import DeliveryCreateModal from '@/features/deliveries/components/DeliveryCreateModal';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import { Icon } from '@/shared/utils/icons';
import { EmptyState, Skeleton, SkeletonRow, SkeletonColumn } from '@/shared/components/ui';
import {
  canViewDeliveries,
  canManageDeliveries,
  canUpdateDeliveryStatus,
  canCreateDeliveries,
  checkPaywall,
  PaywallCheck,
 canCreateProcurementOrders } from '@/shared/utils/permissions';
import { useDeliveries } from '../hooks/useDeliveries';
import { Delivery, DeliveryFilterTab, DeliveryViewType } from '@/shared/types/delivery';
import { useProcurementStore, selectPendingProcurementCount } from '@/features/procurement/store/procurement.store';

// Grouped filter tabs for the delivery filter bar
const DELIVERY_FILTER_TABS: DeliveryFilterTab[] = [
  'all',
  'new',
  'pending',
  'in_transit',
  'done',
  'canceled',
];

export default function DeliveryScreen() {
  const navigation = useNavigation();
  const [showViewDropdown, setShowViewDropdown] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [paywallCheckResult, setPaywallCheckResult] = useState<PaywallCheck | null>(null);
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
  const planAllowsProcurement = canCreateProcurementOrders(activeBusiness?.plan || null);

  // Procurement badge count
  const pendingProcurementCount = useProcurementStore(selectPendingProcurementCount);

  // Get business ID
  const businessId = activeBusiness?.id || '';

  // Use deliveries hook for data
  const {
    filteredDeliveries,
    loading,
    refreshing,
    error,
    statusFilter,
    viewType: activeTab,
    search,
    selectedLocationId,
    setStatusFilter,
    setViewType: setActiveTab,
    setSearch,
    setSelectedLocationId,
    refresh,
  } = useDeliveries();

  // Alias for filter state
  const filter = statusFilter;
  const setFilter = (value: string) => setStatusFilter(value as DeliveryFilterTab);

  // Calculate unread count based on items not yet viewed
  const unviewedDeliveriesCount = useMemo(() => {
    return filteredDeliveries.filter(d => !isItemViewed(d.id)).length;
  }, [filteredDeliveries, isItemViewed]);

  // Update the deliveries unread count when component mounts or data changes
  useEffect(() => {
    setDeliveriesUnreadCount(unviewedDeliveriesCount);
  }, [unviewedDeliveriesCount, setDeliveriesUnreadCount]);

  const handleOpenProcurement = () => {
    if (!planAllowsProcurement) {
      const check = checkPaywall('create_procurement', activeBusiness?.plan || null);
      if (!check.allowed) {
        setPaywallCheckResult(check);
        setShowPaywall(true);
        return;
      }
    }
    (navigation as any).navigate('ProcurementDashboard');
  };

  const handleCreateNew = () => {
    if (!hasManagePermission) {
      Alert.alert('Access Denied', 'Only admins can create new deliveries.');
      return;
    }
    
    // Check if plan allows deliveries (deliveries are part of selling orders workflow)
    if (!planAllowsDeliveries) {
      const check = checkPaywall('create_selling_order', activeBusiness?.plan || null);
      if (!check.allowed) {
        setPaywallCheckResult(check);
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
          { icon: 'checkbox-outline', onPress: () => (navigation as any).navigate('Tasks'), accessibilityLabel: 'Tasks' },
          { icon: 'shopping-cart', onPress: handleOpenProcurement, badge: pendingProcurementCount, accessibilityLabel: 'Procurement' },
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
        statuses={DELIVERY_FILTER_TABS}
        selectedStatus={filter}
        onSelectStatus={setFilter}
        containerStyle={{ flexGrow: 0 }}
      />

      {/* Delivery List */}
      <FlatList<Delivery>
        data={loading ? [] : filteredDeliveries}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={appTheme.colors.primary}
          />
        }
        ListHeaderComponent={
          <>
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
        renderItem={({ item }) => (
          <DeliveryCard 
            delivery={item} 
            isUserAdmin={hasManagePermission}
            currencySymbol={activeBusiness?.settings?.currency || '$'}
            onPress={() => (navigation as any).navigate('DeliveryDetail', { deliveryId: item.id })}
          />
        )}
        ListEmptyComponent={() => {
          if (loading) {
            return (
              <View style={{ paddingTop: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={i} style={{ marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, backgroundColor: appTheme.colors.cardBackground }}>
                    {/* Header: logo + company */}
                    <SkeletonRow gap={12} style={{ marginBottom: 14 }}>
                      <Skeleton width={40} height={40} borderRadius={8} />
                      <SkeletonColumn gap={5} style={{ flex: 1 }}>
                        <Skeleton width="55%" height={16} />
                        <Skeleton width="75%" height={13} />
                      </SkeletonColumn>
                    </SkeletonRow>
                    {/* Detail rows */}
                    {Array.from({ length: 4 }).map((_, j) => (
                      <SkeletonRow key={j} gap={8} style={{ marginBottom: 8 }}>
                        <Skeleton width={16} height={16} borderRadius={4} />
                        <Skeleton width={`${50 + j * 8}%` as `${number}%`} height={14} />
                      </SkeletonRow>
                    ))}
                    {/* Status pills */}
                    <SkeletonRow gap={8} style={{ marginTop: 6 }}>
                      <Skeleton width={80} height={24} borderRadius={12} />
                      <Skeleton width={70} height={24} borderRadius={12} />
                    </SkeletonRow>
                  </View>
                ))}
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
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
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