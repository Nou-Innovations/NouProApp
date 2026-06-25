import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute, DrawerActions } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { EmptyState, Skeleton, SkeletonRow, SkeletonColumn , AppBottomSheet } from '@/shared/components/ui';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/shared/components/ui/FilterBar';
import InvoiceCard from '@/features/invoices/components/InvoiceCard';
import LocationDropdown from '@/shared/components/ui/LocationDropdown';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import InvoiceActionsModal from '@/features/invoices/components/InvoiceActionsModal';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProfileStore } from '@/shared/store/profileStore';
// ARCHITECTURE: Data comes from hook, not mock array
import { useInvoices } from '../hooks/useInvoices';
import type { Invoice, InvoiceStatus } from '../invoices.service';
import {
  canViewInvoices,
  canManageInvoices,
  canGenerateInvoices,
  checkPaywall,
  PaywallCheck,
} from '@/shared/utils/permissions';

export default function InvoicesScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [search, setSearch] = useState('');
  const statuses = ['all', 'draft', 'sent', 'paid', 'overdue'];
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'invoices' | 'estimates'>('invoices');
  const [showViewDropdown, setShowViewDropdown] = useState<boolean>(false);
  const [showActionsModal, setShowActionsModal] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [paywallCheck, setPaywallCheck] = useState<PaywallCheck | null>(null);
  const { theme: appTheme } = useTheme();
  const { setInvoicesUnreadCount, isItemViewed } = useNotifications();
  const currentLocation = useBusinessStore((state) => state.currentLocation);
  const selectedLocationId = currentLocation?.id || null;
  
  // Profile store for RBAC (single source of truth)
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const isAdmin = useProfileStore((state) => state.isAdmin);
  
  // Permission checks
  const hasViewPermission = canViewInvoices(currentUserRole, activeBusiness?.plan || null);
  const hasManagePermission = canManageInvoices(currentUserRole, activeBusiness?.plan || null);
  const planAllowsInvoices = canGenerateInvoices(activeBusiness?.plan || null);

  // ========================================================================
  // ARCHITECTURE: Data comes from useInvoices hook (API → Service → Hook → Screen)
  // Screen no longer owns mock data or fetches directly
  // ========================================================================
  const { 
    invoices, 
    loading, 
    error, 
    refetch,
    filteredInvoices 
  } = useInvoices({ 
    locationId: selectedLocationId 
  });

  // Refetch on screen focus; honor a one-shot `initialTab` (e.g. sidebar → Estimates)
  useFocusEffect(
    useCallback(() => {
      const initialTab = route.params?.initialTab as 'invoices' | 'estimates' | undefined;
      if (initialTab) {
        setActiveTab(initialTab);
        navigation.setParams({ initialTab: undefined } as any);
      }
      refetch();
    }, [refetch, route.params?.initialTab, navigation])
  );

  // Get filtered documents using hook's filter method
  const filteredDocuments = useMemo(() => {
    return filteredInvoices({
      search,
      status: filter as InvoiceStatus | 'all',
      type: activeTab === 'estimates' ? 'estimate' : 'invoice',
    });
  }, [filteredInvoices, search, filter, activeTab]);

  // Calculate unread count based on items not yet viewed
  const unviewedInvoicesCount = useMemo(() => {
    return filteredDocuments.filter(doc => !isItemViewed(doc.id)).length;
  }, [filteredDocuments, isItemViewed]);

  // Update the invoices unread count when component mounts or data changes
  useEffect(() => {
    setInvoicesUnreadCount(unviewedInvoicesCount);
  }, [unviewedInvoicesCount, setInvoicesUnreadCount]);

  const handleCreateNew = () => {
    if (!hasManagePermission) {
      // Check if it's a role issue or plan issue
      if (!planAllowsInvoices) {
        const check = checkPaywall('send_invoice', activeBusiness?.plan || null);
        if (!check.allowed) {
          setPaywallCheck(check);
          setShowPaywall(true);
          return;
        }
      }
      AppAlert.alert('Access Denied', 'Only admins can create invoices and estimates.');
      return;
    }
    
    setShowActionsModal(true);
  };

  const handleCreateInvoice = () => {
    (navigation as any).navigate('CreateInvoice', { type: 'invoice' });
  };

  const handleCreateEstimate = () => {
    (navigation as any).navigate('CreateInvoice', { type: 'estimate' });
  };

  const getTabCount = (tab: 'invoices' | 'estimates') => {
    return invoices.filter(doc => {
      const matchesTab = tab === 'estimates' ? doc.type === 'estimate' : doc.type === 'invoice';
      return matchesTab;
    }).length;
  };

  const toggleViewDropdown = () => {
    setShowViewDropdown(!showViewDropdown);
  };

  const selectDocumentType = (type: 'invoices' | 'estimates') => {
    setActiveTab(type);
    setShowViewDropdown(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      {/* Primary Header */}
      <SecondaryHeader
        title={activeTab === 'invoices' ? 'Invoices' : 'Estimates'}
        onTitlePress={toggleViewDropdown}
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
        rightActions={[
          { icon: 'plus', onPress: handleCreateNew, accessibilityLabel: 'Create invoice' },
        ]}
      />

      {/* Location Selector */}
      <View style={styles.locationSection}>
        <LocationDropdown style={{ flex: 1 }} />
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
        <AppSearchBar
          placeholder={`Search ${activeTab}...`}
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          containerStyle={styles.searchBarContainer}
        />
      </View>

      {/* Filter Bar */}
      <FilterBar 
        statuses={statuses}
        selectedStatus={filter}
        onSelectStatus={setFilter}
        containerStyle={{ flexGrow: 0 }}
      />

      {/* Invoice List */}
      <FlatList
        data={loading ? [] : filteredDocuments}
        keyExtractor={(item: Invoice) => item.id}
        renderItem={({ item }: { item: Invoice }) => (
          <InvoiceCard 
            id={item.id}
            clientCompanyLogo={null}
            clientName={item.clientName}
            invoiceNumber={item.invoiceNumber || item.id}
            totalAmount={item.totalAmount}
            currency={item.currency}
            issueDate={item.issueDate}
            dueDate={item.dueDate}
            status={item.status}
            isAdmin={hasManagePermission}
            onPress={() => (navigation as any).navigate('InvoiceDetails', { invoiceId: item.id })}
          />
        )}
        ListHeaderComponent={
          <></>
        }
        ListEmptyComponent={() => {
          if (loading) {
            return (
              <View style={{ paddingTop: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <View key={i} style={{ marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, backgroundColor: appTheme.colors.cardBackground }}>
                    {/* Header: logo + client */}
                    <SkeletonRow gap={12} style={{ marginBottom: 14 }}>
                      <Skeleton width={40} height={40} borderRadius={8} />
                      <SkeletonColumn gap={5} style={{ flex: 1 }}>
                        <Skeleton width="55%" height={16} />
                        <Skeleton width="35%" height={12} />
                      </SkeletonColumn>
                    </SkeletonRow>
                    {/* Detail rows */}
                    {Array.from({ length: 3 }).map((_, j) => (
                      <SkeletonRow key={j} gap={8} style={{ marginBottom: 8 }}>
                        <Skeleton width={16} height={16} borderRadius={4} />
                        <Skeleton width={`${45 + j * 10}%` as `${number}%`} height={14} />
                      </SkeletonRow>
                    ))}
                    {/* Status pill */}
                    <Skeleton width={80} height={24} borderRadius={12} style={{ marginTop: 6 }} />
                  </View>
                ))}
              </View>
            );
          }
          
          if (error) {
            return (
              <View style={styles.emptyListContainer}>
                <Icon name="alert-circle-outline" size={48} color={appTheme.colors.error} />
                <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
                <TouchableOpacity 
                  style={[styles.retryButton, { backgroundColor: appTheme.colors.primary }]}
                  onPress={refetch}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            );
          }
          
          const isEstimates = activeTab === 'estimates';
          return (
            <EmptyState
              iconName={isEstimates ? 'clipboard-outline' : 'document-text-outline'}
              title={isEstimates ? 'No estimates created' : 'No invoices yet'}
              subtitle={
                selectedLocationId
                  ? `Try selecting "All Locations" to see more ${activeTab}`
                  : isEstimates
                  ? 'Create estimates to send pricing proposals to clients.'
                  : 'Issued and received invoices will be stored here.'
              }
              ctaLabel={hasManagePermission ? (isEstimates ? 'Create estimate' : 'Create invoice') : undefined}
              onCtaPress={hasManagePermission ? handleCreateNew : undefined}
              testID="empty-invoices"
            />
          );
        }}
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ flex: 1 }}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
      />

      {/* Document Type Selection Modal */}
      <AppBottomSheet
        visible={showViewDropdown}
        onClose={() => setShowViewDropdown(false)}
        title="Document Type"
      >
        {[
          { id: 'invoices', title: 'Invoices', icon: 'receipt-text' },
          { id: 'estimates', title: 'Estimates', icon: 'clipboard' },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.bottomSheetItem,
              { borderBottomColor: appTheme.colors.borderColor },
              activeTab === item.id && { backgroundColor: `${appTheme.colors.primary}15` }
            ]}
            onPress={() => {
              selectDocumentType(item.id as 'invoices' | 'estimates');
            }}
          >
            <Icon 
              name={item.icon} 
              size={20} 
              color={activeTab === item.id ? appTheme.colors.primary : appTheme.colors.iconColor} 
            />
            <Text style={[
              styles.bottomSheetItemText,
              { color: activeTab === item.id ? appTheme.colors.primary : appTheme.colors.text }
            ]}>
              {item.title}
            </Text>
            {activeTab === item.id && (
              <Icon name="check" size={20} color={appTheme.colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </AppBottomSheet>

      {/* Actions Bottom Sheet Modal */}
      <InvoiceActionsModal
        visible={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        onCreateInvoice={handleCreateInvoice}
        onCreateEstimate={handleCreateEstimate}
      />

      {/* Paywall Modal for Free Plan Users */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          (navigation as any).navigate('SubscriptionPlans');
        }}
        requiredPlan={paywallCheck?.requiredPlan || 'pro'}
        modalType={paywallCheck?.modalType}
        title={paywallCheck?.title}
        description={paywallCheck?.description}
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
  emptyListContainer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyListText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyListSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  createButtonInline: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonInlineText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // AppBottomSheet item styles
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  bottomSheetItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
