import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/features/search/components/FilterBar';
import InvoiceCard from '@/features/invoices/components/InvoiceCard';
import { AppBottomSheet } from '@/shared/components/ui';

// DropdownItem type (kept for location items)
interface DropdownItem {
  id: string;
  title: string;
  description?: string;
  icon?: string;
}
import SimpleHeader, { AnimatedFlatList, HEADER_HEIGHT } from '@/shared/components/layout/headers/SimpleHeader';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';
import InvoiceActionsModal from '@/features/invoices/components/InvoiceActionsModal';
import PaywallModal from '@/features/subscription/components/PaywallModal';
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
} from '@/shared/utils/permissions';

export default function InvoicesScreen() {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const statuses = ['all', 'draft', 'sent', 'paid', 'overdue'];
  const [filter, setFilter] = useState('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'estimates'>('invoices');
  const [showViewDropdown, setShowViewDropdown] = useState<boolean>(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const { theme: appTheme } = useTheme();
  const { setInvoicesUnreadCount } = useNotifications();
  const { currentCompany, currentLocation } = useBusinessStore();
  
  // Profile store for RBAC (single source of truth)
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const isAdmin = useProfileStore((state) => state.isAdmin);
  
  // Permission checks
  const hasViewPermission = canViewInvoices(currentUserRole, activeBusiness?.plan || null);
  const hasManagePermission = canManageInvoices(currentUserRole, activeBusiness?.plan || null);
  const planAllowsInvoices = canGenerateInvoices(activeBusiness?.plan || null);
  
  // Create scrollY animated value for header animation
  const scrollY = useRef(new Animated.Value(0)).current;

  // ========================================================================
  // ARCHITECTURE: Data comes from useInvoices hook (API → Service → Hook → Screen)
  // Screen no longer owns mock data or fetches directly
  // ========================================================================
  const { 
    invoices, 
    loading, 
    error, 
    isMockData, 
    refetch, 
    filteredInvoices 
  } = useInvoices({ 
    locationId: selectedLocationId 
  });

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Get filtered documents using hook's filter method
  const filteredDocuments = useMemo(() => {
    return filteredInvoices({
      search,
      status: filter as InvoiceStatus | 'all',
      type: activeTab === 'estimates' ? 'estimate' : 'invoice',
    });
  }, [filteredInvoices, search, filter, activeTab]);

  // Calculate new invoices count
  const newInvoicesCount = filteredDocuments.filter(doc => doc.status === 'draft').length;

  // Update the invoices unread count when component mounts or data changes
  useEffect(() => {
    setInvoicesUnreadCount(newInvoicesCount);
  }, [newInvoicesCount, setInvoicesUnreadCount]);

  const handleLocationSelect = (item: DropdownItem) => {
    const locationId = item.id === 'all' ? null : item.id;
    setSelectedLocationId(locationId);
  };

  // Check user permissions for global vs location-scoped access
  const canViewAllInvoices = isAdmin();

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

  const handleCreateNew = () => {
    if (!hasManagePermission) {
      // Check if it's a role issue or plan issue
      if (!planAllowsInvoices) {
        const paywallCheck = checkPaywall('create_invoice', activeBusiness?.plan || null);
        if (!paywallCheck.allowed) {
          setShowPaywall(true);
          return;
        }
      }
      Alert.alert('Access Denied', 'Only admins can create invoices and estimates.');
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
      <SimpleHeader
        headerComponent={
          <PrimaryHeader
            title={activeTab === 'invoices' ? 'Invoices' : 'Estimates'}
            onTitlePress={toggleViewDropdown}
            actions={[
              { icon: 'plus', onPress: handleCreateNew, accessibilityLabel: 'Create invoice' },
            ]}
          />
        }
        searchComponent={
          <View style={{ backgroundColor: appTheme.colors.background }}>
            {/* Location Filter Section */}
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
                placeholder={`Search ${activeTab}...`}
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
            statuses={statuses}
            selectedStatus={filter}
            onSelectStatus={setFilter}
            containerStyle={{ flexGrow: 0 }}
          />
        }
      >
        <AnimatedFlatList
          data={loading ? [] : filteredDocuments}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <InvoiceCard 
              clientCompanyLogo={null}
              clientName={item.clientName}
              invoiceNumber={item.id}
              totalAmount={item.totalAmount}
              issueDate={item.issueDate}
              dueDate={item.dueDate}
              status={item.status}
              isAdmin={hasManagePermission}
              onPress={() => (navigation as any).navigate('InvoiceDetails', { invoiceId: item.id })}
            />
          )}
          ListHeaderComponent={
            <>
              {/* Mock Data Indicator (DEV only) */}
              {__DEV__ && isMockData && !loading && (
                <View style={[styles.mockDataBanner, { backgroundColor: appTheme.colors.warning }]}>
                  <Text style={styles.mockDataText}>Using mock data (API unavailable)</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyListContainer}>
              {/* Loading State */}
              {loading ? (
                <>
                  <ActivityIndicator size="large" color={appTheme.colors.primary} />
                  <Text style={[styles.loadingText, { color: appTheme.colors.textSecondary }]}>
                    Loading {activeTab}...
                  </Text>
                </>
              ) : error ? (
                /* Error State */
                <>
                  <Icon name="alert-circle-outline" size={48} color={appTheme.colors.error} />
                  <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
                  <TouchableOpacity 
                    style={[styles.retryButton, { backgroundColor: appTheme.colors.primary }]}
                    onPress={refetch}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Empty State */
                <>
                  <Icon 
                name={activeTab === 'invoices' ? 'document-text-outline' : 'clipboard-outline'} 
                size={60} 
                color={appTheme.colors.textLight} 
              />
              <Text style={[styles.emptyListText, { color: appTheme.colors.textLight }]}>
                No {activeTab} found
              </Text>
              {selectedLocationId && (
                <Text style={[styles.emptyListSubtext, { color: appTheme.colors.textLight }]}>
                  Try selecting "All Locations" to see more {activeTab}
                </Text>
              )}
              {hasManagePermission && (
                <TouchableOpacity 
                  style={[styles.createButtonInline, { backgroundColor: appTheme.colors.primary }]}
                  onPress={handleCreateNew}
                >
                  <Text style={styles.createButtonInlineText}>
                    Create {activeTab === 'invoices' ? 'Invoice' : 'Estimate'}
                  </Text>
                </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
          contentContainerStyle={{
            // paddingTop: HEADER_HEIGHT, // Removed - SimpleHeader handles this automatically
          }}
          style={{ flex: 1 }}
        />
      </SimpleHeader>

      {/* Document Type Selection Modal */}
      <AppBottomSheet
        visible={showViewDropdown}
        onClose={() => setShowViewDropdown(false)}
        title="Document Type"
      >
        {[
          { id: 'invoices', title: 'Invoices', icon: 'file-text' },
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

      {/* Location Selection Modal */}
      <AppBottomSheet
        visible={showLocationDropdown}
        onClose={() => setShowLocationDropdown(false)}
        title="Locations"
      >
        <ScrollView style={{ maxHeight: 300 }}>
          {locationItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.bottomSheetItem,
                { borderBottomColor: appTheme.colors.borderColor },
                (selectedLocationId || 'all') === item.id && { backgroundColor: `${appTheme.colors.primary}15` }
              ]}
              onPress={() => {
                handleLocationSelect(item);
                setShowLocationDropdown(false);
              }}
            >
              <Icon 
                name={item.icon || 'map-pin'} 
                size={20} 
                color={(selectedLocationId || 'all') === item.id ? appTheme.colors.primary : appTheme.colors.iconColor} 
              />
              <Text style={[
                styles.bottomSheetItemText,
                { color: (selectedLocationId || 'all') === item.id ? appTheme.colors.primary : appTheme.colors.text }
              ]}>
                {item.title}
              </Text>
              {(selectedLocationId || 'all') === item.id && (
                <Icon name="check" size={20} color={appTheme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
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
          (navigation as any).navigate('Subscription');
        }}
        requiredPlan="pro"
        featureName="creating invoices and estimates"
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
  mockDataBanner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 6,
  },
  mockDataText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '500',
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
