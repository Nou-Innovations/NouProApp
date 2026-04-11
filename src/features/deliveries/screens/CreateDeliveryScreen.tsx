/**
 * CreateDeliveryScreen
 * Create new deliveries or transfers based on app-logic.json
 * 
 * Delivery fields: Select Client, Order ID, Select Items, Schedule for, Transport, Staff, Notes
 * Transfer fields: Destination Location, Transfer ID, Select Items, Schedule for, Transport, Staff, Notes
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import AppTextField from '@/shared/components/ui/AppTextField';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import { RootStackParamList } from '@/shared/types/navigation';
import type { Staff } from '@/shared/types/delivery';
import { getProducts } from '@/features/products/products.service';
import { getTeamMembers } from '@/features/team/team.service';
import { searchContacts } from '@/features/inbox/inbox.service';
import { getTransports } from '@/features/transports/transports.service';
import type { Transport, VehicleType, VehicleStatus } from '@/shared/types/transport';
import { getVehicleIcon, getVehicleStatusLabel, VEHICLE_STATUS_COLORS } from '@/shared/types/transport';

// Business vehicle interface for this screen's transport picker
interface BusinessVehicle {
  id: string;
  name: string;
  vehicle_type: VehicleType;
  license_plate?: string;
  status: VehicleStatus;
}

// Get status color for vehicle
const getVehicleStatusColor = (status: VehicleStatus): string => {
  return VEHICLE_STATUS_COLORS[status] || '#9CA3AF';
};
import { formatCurrency } from '@/shared/utils/format';
import { AppModal, AppBottomSheet, AppSearchBar, DateSelector, TimeSelector, ListItemCard } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { canUseAdvancedPermissions } from '@/shared/utils/permissions';
import { createDelivery } from '@/features/deliveries/deliveries.service';
import { useDeliveriesStore } from '@/features/deliveries/deliveries.store';
import AssignStaffModal from '@/shared/components/ui/AssignStaffModal';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import { checkPaywall, PaywallCheck } from '@/shared/utils/permissions';
import type { DeliveryStaffRole } from '@/shared/types/delivery';

interface SelectedStaffMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  assignedRole: 'driver' | 'teamLeader' | 'support';
}

type CreateDeliveryRouteProp = RouteProp<RootStackParamList, 'CreateDelivery'>;


// Item type for selection
interface SelectedItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

// Generate unique ID with prefix
const generateId = (prefix: string): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

export default function CreateDeliveryScreen() {
  const navigation = useNavigation();
  const route = useRoute<CreateDeliveryRouteProp>();
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Get mode from route params
  const mode = route.params?.mode || 'delivery';
  const isTransfer = mode === 'transfer';
  
  // Store state
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentUser = useProfileStore((state) => state.currentUser);
  const locations = useBusinessStore((state) => state.locations);
  const currentLocation = useBusinessStore((state) => state.currentLocation);
  
  // Defensive check for locations (with single location logic)
  const safeLocations = Array.isArray(locations) ? locations : [];
  const hasSingleLocation = safeLocations.length === 1;
  const primaryLocation = safeLocations.find(loc => (loc as any).is_primary) || safeLocations[0];
  
  // Check if user can edit ID (Business or Enterprise plan with advanced permissions)
  const canEditId = canUseAdvancedPermissions(activeBusiness?.plan || null);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; type: string; address: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<typeof locations[0] | null>(null);
  const [documentId, setDocumentId] = useState(generateId(isTransfer ? 'TRF-' : 'ORD-'));
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [selectedTransport, setSelectedTransport] = useState<BusinessVehicle | null>(null);
  const [selectedStaffList, setSelectedStaffList] = useState<SelectedStaffMember[]>([]);
  const [notes, setNotes] = useState('');
  
  // Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallCheckResult, setPaywallCheckResult] = useState<PaywallCheck | null>(null);
  
  // Search states for modals
  const [clientSearch, setClientSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  // staffSearch state removed - now handled by AssignStaffModal
  
  // Track which product input should be focused and if user has edited
  const [focusedProductId, setFocusedProductId] = useState<string | null>(null);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [editedProducts, setEditedProducts] = useState<Set<string>>(new Set());
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const animationRefs = useRef<{ [key: string]: Animated.Value }>({});

  // Fetched data state
  const [apiProducts, setApiProducts] = useState<any[]>([]);
  const [apiStaff, setApiStaff] = useState<Staff[]>([]);
  const [apiClients, setApiClients] = useState<{ id: string; name: string; type: string; address: string }[]>([]);
  const [businessVehicles, setBusinessVehicles] = useState<BusinessVehicle[]>([]);

  // Fetch real data on mount
  useEffect(() => {
    const companyId = activeBusiness?.id;
    if (!companyId) return;

    // Fetch products
    getProducts({ companyId }).then(products => {
      setApiProducts(products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price || 0,
        imageUrl: p.productPicture || '',
        brandName: p.brand || '',
      })));
    }).catch(() => {
      setApiProducts([]);
    });

    // Fetch team members (staff)
    getTeamMembers(companyId, 'accepted').then(members => {
      setApiStaff(members.map(m => ({
        id: m.userId || m.id,
        name: m.name || m.userName || 'Unknown',
        role: m.role || 'staff',
        avatar: m.avatar,
      })));
    }).catch(() => {
      setApiStaff([]);
    });

    // Fetch real transports/vehicles
    getTransports(companyId).then(transports => {
      setBusinessVehicles(transports.map(t => ({
        id: t.id,
        name: t.name,
        vehicle_type: t.vehicle_type,
        license_plate: t.license_plate,
        status: t.status,
      })));
    }).catch(() => {
      // Keep empty array on error - no mock fallback
    });

    // Fetch real business contacts for client selection
    const userId = currentUser?.id;
    if (userId) {
      searchContacts(userId).then(contacts => {
        const businessContacts = contacts
          .filter(c => c.type === 'business' && c.is_connected)
          .map(c => ({
            id: c.id,
            name: c.name,
            type: c.role || 'Business',
            address: '',
          }));
        setApiClients(businessContacts);
      }).catch(() => {
        setApiClients([]);
      });
    }
  }, [activeBusiness?.id, currentUser?.id]);

  // All products from API
  const allProducts = useMemo(() => {
    return apiProducts;
  }, [apiProducts]);

  // Filtered products based on search
  const filteredProducts = useMemo(() => {
    if (!itemSearch) return allProducts;
    const searchLower = itemSearch.toLowerCase();
    return allProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.brandName.toLowerCase().includes(searchLower)
    );
  }, [allProducts, itemSearch]);

  // Filtered clients based on search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return apiClients;
    const searchLower = clientSearch.toLowerCase();
    return apiClients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchLower) ||
        client.address.toLowerCase().includes(searchLower) ||
        client.type.toLowerCase().includes(searchLower)
    );
  }, [clientSearch, apiClients]);

  // filteredStaff removed - search is now handled internally by AssignStaffModal
  
  // Calculate totals
  const orderTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [selectedItems]);

  const totalItemsCount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedItems]);

  // Handle ID change with validation
  const handleIdChange = (text: string) => {
    const prefix = isTransfer ? 'TRF-' : 'ORD-';
    if (text.startsWith(prefix)) {
      setDocumentId(text.toUpperCase());
    } else {
      setDocumentId(prefix + text.replace(prefix, '').toUpperCase());
    }
  };

  // Get or create animation value for a product
  const getAnimValue = (productId: string) => {
    if (!animationRefs.current[productId]) {
      animationRefs.current[productId] = new Animated.Value(0);
    }
    return animationRefs.current[productId];
  };

  // Handle adding item and focus input with animation
  const handleAddItem = (product: any) => {
    // Initialize animation value
    const animValue = getAnimValue(product.id);
    animValue.setValue(0);
    
    setSelectedItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
      },
    ]);
    
    // Animate in with ease-in-out
    Animated.timing(animValue, {
      toValue: 1,
      duration: 200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    
    // Set focus state and focus the input after render
    setFocusedProductId(product.id);
    setActiveInputId(product.id);
    setTimeout(() => {
      inputRefs.current[product.id]?.focus();
    }, 150);
  };

  // Handle removing item with animation
  const handleRemoveItem = (productId: string) => {
    const animValue = getAnimValue(productId);
    
    // Animate out with ease-in-out
    Animated.timing(animValue, {
      toValue: 0,
      duration: 200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setSelectedItems((prev) => prev.filter((item) => item.product_id !== productId));
      setEditedProducts((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      setFocusedProductId(null);
    });
  };
  
  // Handle quantity input change - empty field with placeholder
  const handleQuantityInput = (productId: string, text: string) => {
    if (text === '') {
      // User deleted everything, mark as not edited (will show placeholder)
      setEditedProducts((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      handleQuantityChange(productId, 1); // Keep internal value at 1
      return;
    }
    
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0) {
      setEditedProducts((prev) => new Set(prev).add(productId));
      handleQuantityChange(productId, num);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setSelectedItems((prev) => prev.filter((item) => item.product_id !== productId));
    } else {
      setSelectedItems((prev) =>
        prev.map((item) =>
          item.product_id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  // Get item quantity
  const getItemQuantity = (productId: string): number => {
    const item = selectedItems.find((i) => i.product_id === productId);
    return item?.quantity || 0;
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Validate and submit
  const handleCreate = () => {
    // Validation
    if (!isTransfer && !selectedClient) {
      Alert.alert('Missing Information', 'Please select a client.');
      return;
    }
    if (isTransfer && !selectedLocation) {
      Alert.alert('Missing Information', 'Please select a destination location.');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one item.');
      return;
    }

    const summary = isTransfer
      ? `Transfer to ${selectedLocation?.name}\n\n${totalItemsCount} items • ${formatCurrency(orderTotal)}`
      : `Delivery to ${selectedClient?.name}\n\n${totalItemsCount} items • ${formatCurrency(orderTotal)}`;

    Alert.alert(
      `Confirm ${isTransfer ? 'Transfer' : 'Delivery'}`,
      summary,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            if (!activeBusiness?.id) {
              Alert.alert('Error', 'No active business selected');
              return;
            }
            setIsCreating(true);
            try {
              const newDelivery = await createDelivery(activeBusiness.id, {
                type: isTransfer ? 'transfer' : 'delivery',
                // Deliveries created manually are always outgoing; incoming ones are auto-created from received orders
                direction: 'outgoing',
                locationId: currentLocation?.id,
                clientCompanyName: isTransfer
                  ? selectedLocation?.name ?? 'Internal Transfer'
                  : selectedClient?.name ?? 'Unknown Client',
                clientAddress: isTransfer
                  ? selectedLocation?.address ?? ''
                  : selectedClient?.address ?? '',
                clientId: isTransfer ? undefined : selectedClient?.id,
                expectedDeliveryDateTime: scheduledDate.toISOString(),
                items: selectedItems.map((item) => ({
                  productId: item.product_id,
                  name: item.product_name,
                  image: '',
                  price: item.unit_price,
                  quantityOrdered: item.quantity,
                  status: 'Available' as const,
                })),
                itemCount: totalItemsCount,
                totalAmount: orderTotal,
                transportMode: selectedTransport?.id,
                assignedStaffId: selectedStaffList.length > 0 ? selectedStaffList.find(s => s.assignedRole === 'driver')?.id || selectedStaffList[0].id : undefined,
                assignedTo: selectedStaffList.length > 0 ? selectedStaffList.find(s => s.assignedRole === 'driver')?.name || selectedStaffList[0].name : undefined,
                staffAssignments: selectedStaffList.length > 0
                  ? selectedStaffList.map(s => ({ userId: s.id, role: (s.assignedRole || 'driver') as DeliveryStaffRole }))
                  : undefined,
                clientNotes: notes || undefined,
                // Transfer-specific fields
                fromLocation: isTransfer ? (currentLocation?.name || 'Current Location') : undefined,
                toLocation: isTransfer ? selectedLocation?.name : undefined,
              });
              // Add new delivery to the store so it appears immediately in the list
              if (newDelivery) {
                useDeliveriesStore.getState().addDelivery(newDelivery);
              }
              setSuccessMessage(`${isTransfer ? 'Transfer' : 'Delivery'} created successfully!`);
              setShowSuccessDialog(true);
            } catch (error) {
              console.error('Error creating delivery:', error);
              Alert.alert('Error', 'Failed to create delivery. Please try again.');
            } finally {
              setIsCreating(false);
            }
          },
        },
      ]
    );
  };

  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get color for avatar based on name hash
  const getAvatarColor = (name: string): string => {
    const colors = ['#4ECDC4', '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      {/* Header */}
      <SecondaryHeader
        title={isTransfer ? 'Create Transfer' : 'Create Delivery'}
        leftAction={{
          icon: 'chevron-back',
          onPress: () => navigation.goBack(),
        }}
      />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Client / Location Selection */}
          {isTransfer ? (
            <AppTextField
              label="Destination Location"
              value={selectedLocation?.name || ''}
              onChangeText={() => {}}
              placeholder="Select destination location"
              leftIcon="location-outline"
              isDropdown
              onPress={() => setShowLocationModal(true)}
              containerStyle={styles.fieldContainer}
            />
          ) : (
            <AppTextField
              label="Select Client"
              value={selectedClient?.name || ''}
              onChangeText={() => {}}
              placeholder="Select client business"
              leftIcon="business-outline"
              isDropdown
              onPress={() => setShowClientModal(true)}
              containerStyle={styles.fieldContainer}
            />
          )}

          {/* Document ID */}
          <View style={styles.fieldContainer}>
            <View style={styles.documentIdHeader}>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.medium }]}>
                {isTransfer ? 'Transfer ID' : 'Order ID'}
              </Text>
              {!canEditId && (
                <View style={[styles.lockBadge, { backgroundColor: appTheme.colors.surface }]}>
                  <Icon name="lock-closed" size={12} color={appTheme.colors.textLight} />
                  <Text style={[styles.lockText, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                    Upgrade to edit
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.documentIdFieldWrapper}>
              <AppTextField
                label=""
                value={documentId}
                onChangeText={handleIdChange}
                placeholder={isTransfer ? 'TRF-XXXXXX' : 'ORD-XXXXXX'}
                leftIcon="document-text-outline"
                disabled={!canEditId}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Select Items */}
          <View style={styles.fieldContainer}>
            <AppTextField
              label="Select Items"
              value={selectedItems.length > 0 ? `${totalItemsCount} items • ${formatCurrency(orderTotal)}` : ''}
              onChangeText={() => {}}
              placeholder="Add items to this delivery"
              leftIcon="cube-outline"
              isDropdown
              onPress={() => setShowItemsModal(true)}
            />
            
            {/* Selected Items Preview */}
            {selectedItems.length > 0 && (
              <View style={[styles.itemsPreview, { borderColor: appTheme.colors.borderColor }]}>
                {selectedItems.slice(0, 3).map((item) => (
                  <View key={item.product_id} style={styles.itemPreviewRow}>
                    <Text style={[styles.itemPreviewName, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.regular }]} numberOfLines={1}>
                      {item.product_name}
                    </Text>
                    <Text style={[styles.itemPreviewQty, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.medium }]}>
                      x{item.quantity}
                    </Text>
                  </View>
                ))}
                {selectedItems.length > 3 && (
                  <Text style={[styles.itemsMore, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                    +{selectedItems.length - 3} more items
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Schedule For */}
          <AppTextField
            label="Schedule for"
            value={formatDate(scheduledDate)}
            onChangeText={() => {}}
            placeholder="Select date and time"
            leftIcon="calendar-outline"
            isDropdown
            onPress={() => setShowScheduleModal(true)}
            containerStyle={styles.fieldContainer}
          />

          {/* Delivery Transport */}
          <AppTextField
            label="Delivery Transport"
            value={selectedTransport?.name || ''}
            onChangeText={() => {}}
            placeholder="Select transport mode"
            leftIcon="car-outline"
            isDropdown
            onPress={() => {
              const check = checkPaywall('assign_transport', activeBusiness?.plan || null);
              if (!check.allowed) {
                setPaywallCheckResult(check);
                setShowPaywall(true);
                return;
              }
              setShowTransportModal(true);
            }}
            containerStyle={styles.fieldContainer}
          />

          {/* Assign Staff */}
          <AppTextField
            label="Assign Staff"
            value={selectedStaffList.length > 0
              ? selectedStaffList.length === 1
                ? selectedStaffList[0].name
                : `${selectedStaffList[0].name} +${selectedStaffList.length - 1} more`
              : ''}
            onChangeText={() => {}}
            placeholder="Select staff members"
            leftIcon="person-outline"
            isDropdown
            onPress={() => {
              const check = checkPaywall('assign_transport', activeBusiness?.plan || null);
              if (!check.allowed) {
                setPaywallCheckResult(check);
                setShowPaywall(true);
                return;
              }
              setShowStaffModal(true);
            }}
            containerStyle={styles.fieldContainer}
          />

          {/* Notes */}
          <AppTextField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes or special instructions..."
            isMultiline
            minHeight={48}
            containerStyle={styles.fieldContainer}
          />

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: appTheme.colors.primary, opacity: isCreating ? 0.6 : 1 }]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          <Text style={[styles.createButtonText, { fontFamily: theme.fonts.primary.bold }]}>
            {isCreating ? 'Creating...' : isTransfer ? 'Create Transfer' : 'Create Delivery'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Client Selection Modal */}
      <AppBottomSheet
        visible={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setClientSearch('');
        }}
        title="Select Client"
      >
        <View style={styles.bottomSheetContent}>
          <AppSearchBar
            placeholder="Search clients..."
            value={clientSearch}
            onChangeText={setClientSearch}
            onClear={() => setClientSearch('')}
            containerStyle={styles.searchBarContainer}
          />
          <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
            {filteredClients.map((item, index) => (
              <ListItemCard
                key={item.id}
                avatar={{
                  type: 'initials',
                  userId: item.id,
                  userName: item.name,
                }}
                title={item.name}
                subtitle={`${item.type} • ${item.address}`}
                onPress={() => {
                  setSelectedClient(item);
                  setShowClientModal(false);
                  setClientSearch('');
                }}
                selected={selectedClient?.id === item.id}
                showCheckmark
                showDivider={index < filteredClients.length - 1}
              />
            ))}
            {filteredClients.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="search-outline" size={40} color={appTheme.colors.textLight} />
                <Text style={[styles.emptyText, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                  No clients found
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </AppBottomSheet>

      {/* Location Selection Modal */}
      <AppBottomSheet
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="Select Destination"
      >
        <View style={styles.bottomSheetContent}>
          <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
            {safeLocations.filter(loc => loc.id !== currentLocation?.id).map((item, index, arr) => (
              <ListItemCard
                key={item.id}
                avatar={{
                  type: 'icon',
                  icon: 'location',
                  iconColor: '#FFFFFF',
                  backgroundColor: '#EAB308',
                }}
                title={item.name}
                subtitle={item.address}
                onPress={() => {
                  setSelectedLocation(item);
                  setShowLocationModal(false);
                }}
                selected={selectedLocation?.id === item.id}
                showCheckmark
                showDivider={index < arr.length - 1}
              />
            ))}
            {safeLocations.filter(loc => loc.id !== currentLocation?.id).length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="location-outline" size={48} color={appTheme.colors.textLight} />
                <Text style={[styles.emptyText, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                  No other locations available.{'\n'}Add more locations in settings.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </AppBottomSheet>

      {/* Items Selection Modal */}
      <AppBottomSheet
        visible={showItemsModal}
        onClose={() => {
          setShowItemsModal(false);
          setItemSearch('');
        }}
        title="Select Items"
        fullHeight
      >
        <View style={styles.bottomSheetContentFullHeight}>
          {/* Summary Bar */}
          {selectedItems.length > 0 && (
            <View style={[styles.itemsSummaryBar, { backgroundColor: appTheme.colors.surface }]}>
              <View style={styles.summaryInfo}>
                <Text style={[styles.summaryCount, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.semiBold }]}>
                  {totalItemsCount} items
                </Text>
                <Text style={[styles.summaryTotal, { color: appTheme.colors.primary, fontFamily: theme.fonts.primary.bold }]}>
                  {formatCurrency(orderTotal)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: appTheme.colors.primary }]}
                onPress={() => {
                  setShowItemsModal(false);
                  setItemSearch('');
                }}
              >
                <Text style={[styles.doneButtonText, { fontFamily: theme.fonts.primary.bold }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Search Bar */}
          <AppSearchBar
            placeholder="Search products..."
            value={itemSearch}
            onChangeText={setItemSearch}
            onClear={() => setItemSearch('')}
            containerStyle={styles.searchBarContainer}
          />
          
          <ScrollView 
            style={styles.modalScrollListFullHeight} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom }}
          >
            {filteredProducts.map((product, index) => {
              const quantity = getItemQuantity(product.id);
              const isSelected = quantity > 0;

              return (
                <View key={product.id}>
                  <View style={styles.productItem}>
                    {/* Product Image */}
                    <Image
                      source={{ uri: product.imageUrl }}
                      style={styles.productImage}
                    />
                    
                    <View style={styles.productInfo}>
                      <Text style={[styles.productBrand, { color: appTheme.colors.textMuted, fontFamily: theme.fonts.primary.medium }]}>
                        {product.brandName}
                      </Text>
                      <Text style={[styles.productName, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.bold }]} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={[styles.productPrice, { color: appTheme.colors.textSecondary, fontFamily: theme.fonts.primary.semiBold }]}>
                        {formatCurrency(product.price)}
                      </Text>
                    </View>

                    {isSelected ? (
                      <Animated.View 
                        style={[
                          styles.selectedItemControls,
                          {
                            opacity: getAnimValue(product.id),
                            transform: [{
                              scale: getAnimValue(product.id).interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.8, 1],
                              }),
                            }],
                          }
                        ]}
                      >
                        <View style={[
                          styles.quantityInputContainer,
                          { 
                            backgroundColor: activeInputId === product.id ? appTheme.colors.cardBackground : appTheme.colors.surface,
                            borderColor: activeInputId === product.id ? appTheme.colors.primary : appTheme.colors.borderColor,
                          }
                        ]}>
                          <TextInput
                            ref={(ref) => { inputRefs.current[product.id] = ref; }}
                            style={[
                              styles.quantityInput,
                              { 
                                color: appTheme.colors.primary, 
                                fontFamily: theme.fonts.primary.bold,
                              }
                            ]}
                            value={editedProducts.has(product.id) ? String(quantity) : ''}
                            placeholder="1"
                            placeholderTextColor={appTheme.colors.textMuted}
                            onChangeText={(text) => handleQuantityInput(product.id, text)}
                            onFocus={() => setActiveInputId(product.id)}
                            onBlur={() => {
                              setActiveInputId(null);
                              if (!editedProducts.has(product.id) || quantity === 0) {
                                handleRemoveItem(product.id);
                              }
                            }}
                            keyboardType="number-pad"
                            maxLength={5}
                            selectionColor={appTheme.colors.primary}
                          />
                        </View>
                        <TouchableOpacity
                          style={[styles.removeItemButton, { backgroundColor: appTheme.colors.surface }]}
                          onPress={() => handleRemoveItem(product.id)}
                        >
                          <Icon name="close" size={18} color={appTheme.colors.text} />
                        </TouchableOpacity>
                      </Animated.View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addItemButton, { backgroundColor: appTheme.colors.primary }]}
                        onPress={() => handleAddItem(product)}
                      >
                        <Icon name="add" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {index < filteredProducts.length - 1 && (
                    <View style={[styles.productDivider, { backgroundColor: appTheme.colors.surface }]} />
                  )}
                </View>
              );
            })}
            {filteredProducts.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="cube-outline" size={40} color={appTheme.colors.textLight} />
                <Text style={[styles.emptyText, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                  No products found
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </AppBottomSheet>

      {/* Schedule Modal */}
      <AppBottomSheet
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Delivery"
      >
        <View style={styles.scheduleContent}>
          {/* Time Section */}
          <View style={styles.scheduleSection}>
            <Text style={[styles.scheduleSectionTitle, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.semiBold }]}>
              Time
            </Text>
            <View style={[styles.timeSelectorWrapper, { backgroundColor: appTheme.colors.surface }]}>
              <TimeSelector
                value={scheduledDate}
                onChange={setScheduledDate}
                minuteStep={5}
              />
            </View>
          </View>

          {/* Date Section */}
          <View style={styles.scheduleSection}>
            <Text style={[styles.scheduleSectionTitle, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.semiBold }]}>
              Date
            </Text>
            <DateSelector
              value={scheduledDate}
              onChange={setScheduledDate}
              minDate={new Date()}
              calendarHeight={340}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.scheduleActions}>
            <TouchableOpacity
              style={[styles.scheduleActionButton, styles.scheduleCancelButton, { borderColor: appTheme.colors.borderColor }]}
              onPress={() => setShowScheduleModal(false)}
            >
              <Text style={[styles.scheduleCancelText, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.medium }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scheduleActionButton, styles.scheduleConfirmButton, { backgroundColor: appTheme.colors.primary }]}
              onPress={() => setShowScheduleModal(false)}
            >
              <Text style={[styles.scheduleConfirmText, { fontFamily: theme.fonts.primary.bold }]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppBottomSheet>

      {/* Transport Selection Modal */}
      <AppBottomSheet
        visible={showTransportModal}
        onClose={() => setShowTransportModal(false)}
        title="Select Vehicle"
      >
        <View style={styles.bottomSheetContent}>
          <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
            {businessVehicles
              .filter(v => v.status !== 'inactive') // Hide inactive vehicles
              .map((item, index, arr) => {
                const isAvailable = item.status === 'available';
                return (
                  <ListItemCard
                    key={item.id}
                    avatar={{
                      type: 'icon',
                      icon: getVehicleIcon(item.vehicle_type),
                      iconColor: appTheme.colors.primary,
                      backgroundColor: appTheme.colors.surface,
                    }}
                    title={item.name}
                    subtitle={item.license_plate ? `${item.vehicle_type.charAt(0).toUpperCase() + item.vehicle_type.slice(1)} • ${item.license_plate}` : item.vehicle_type.charAt(0).toUpperCase() + item.vehicle_type.slice(1)}
                    onPress={isAvailable ? () => {
                      setSelectedTransport(item);
                      setShowTransportModal(false);
                    } : undefined}
                    selected={selectedTransport?.id === item.id}
                    showCheckmark
                    statusPill={{
                      text: getVehicleStatusLabel(item.status),
                      color: getVehicleStatusColor(item.status),
                    }}
                    showDivider={index < arr.length - 1}
                    disabled={!isAvailable}
                  />
                );
            })}
            {businessVehicles.filter(v => v.status !== 'inactive').length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="car-outline" size={40} color={appTheme.colors.textLight} />
                <Text style={[styles.emptyText, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                  No vehicles available
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </AppBottomSheet>

      {/* Staff Selection Modal */}
      <AssignStaffModal
        visible={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        staff={apiStaff}
        selectedStaff={selectedStaffList}
        onConfirm={(selected) => {
          setSelectedStaffList(selected as SelectedStaffMember[]);
        }}
        title="Assign Staff"
      />

      {/* Paywall Modal for Free Plan Users */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          navigation.navigate('Subscription' as never);
        }}
        requiredPlan={paywallCheckResult?.requiredPlan || 'pro'}
        modalType={paywallCheckResult?.modalType}
        title={paywallCheckResult?.title}
        description={paywallCheckResult?.description}
      />

      {/* Success Dialog */}
      <AppModal
        visible={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
        variant="success"
        title="Success"
        message={successMessage}
        primaryButtonText="OK"
        onPrimaryAction={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  documentIdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  documentIdFieldWrapper: {
    marginTop: -26, // Counteract AppTextField's empty label (Text height ~14 + marginBottom 8)
  },
  fieldLabel: {
    fontSize: 14,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  lockText: {
    fontSize: 11,
  },
  itemsPreview: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  itemPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemPreviewName: {
    flex: 1,
    fontSize: 14,
  },
  itemPreviewQty: {
    fontSize: 14,
  },
  itemsMore: {
    fontSize: 13,
    marginTop: 4,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
  },
  // Bottom sheet content
  bottomSheetContent: {
    maxHeight: 500,
  },
  bottomSheetContentFullHeight: {
    flex: 1,
  },
  searchBarContainer: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  modalScrollList: {
    maxHeight: 400,
  },
  modalScrollListFullHeight: {
    flex: 1,
  },
  // Empty state for selection modals
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Items modal specific
  itemsSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryCount: {
    fontSize: 14,
  },
  summaryTotal: {
    fontSize: 15,
  },
  doneButton: {
    paddingHorizontal: 20,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productBrand: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 16,
  },
  productPrice: {
    fontSize: 14,
  },
  productDivider: {
    height: 1,
    marginHorizontal: 12,
  },
  selectedItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInputContainer: {
    width: 96,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: '100%',
    height: '100%',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  addItemButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeItemButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Schedule modal specific
  scheduleContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  scheduleSection: {
    marginBottom: 24,
  },
  scheduleSectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  timeSelectorWrapper: {
    paddingVertical: 16,
    borderRadius: 12,
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  scheduleActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleCancelButton: {
    borderWidth: 1,
  },
  scheduleCancelText: {
    fontSize: 15,
  },
  scheduleConfirmButton: {
    
  },
  scheduleConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
