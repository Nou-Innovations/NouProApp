/**
 * CreateDeliveryScreen
 * Create new deliveries or transfers based on app-logic.json
 * 
 * Delivery fields: Select Client, Order ID, Select Items, Schedule for, Transport, Staff, Notes
 * Transfer fields: Destination Location, Transfer ID, Select Items, Schedule for, Transport, Staff, Notes
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  FlatList,
} from 'react-native';
import AppTextField from '@/shared/components/ui/AppTextField';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import { RootStackParamList } from '@/shared/types/navigation';
import { mockStaff, mockTransportModes, Staff, TransportMode } from '@/shared/data/mockDeliveries';
import { mockBrands } from '@/shared/data/businessProfile';
import { formatCurrency } from '@/shared/data/mockOrders';
import { AppModal, AppBottomSheet, AppSearchBar, DateSelector, TimeSelector, ListItemCard } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { SecondaryHeader } from '@/shared/components/layout/headers';

type CreateDeliveryRouteProp = RouteProp<RootStackParamList, 'CreateDelivery'>;

// Mock clients for delivery
const mockClients = [
  { id: 'biz-003', name: 'FreshMart Retailers', type: 'Retailer', address: 'Port Louis, Mauritius' },
  { id: 'biz-004', name: 'Tech Haven Store', type: 'Electronics', address: 'Curepipe, Mauritius' },
  { id: 'biz-005', name: 'GreenLife Supermarket', type: 'Supermarket', address: 'Rose Hill, Mauritius' },
  { id: 'biz-006', name: 'Island Electronics', type: 'Electronics', address: 'Quatre Bornes, Mauritius' },
  { id: 'biz-010', name: 'Corner Shop Mauritius', type: 'Convenience', address: 'Vacoas, Mauritius' },
];

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
  
  // Get mode from route params
  const mode = route.params?.mode || 'delivery';
  const isTransfer = mode === 'transfer';
  
  // Store state
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const { locations, currentLocation } = useBusinessStore();
  
  // Defensive check for locations (with single location logic)
  const safeLocations = Array.isArray(locations) ? locations : [];
  const hasSingleLocation = safeLocations.length === 1;
  const primaryLocation = safeLocations.find(loc => (loc as any).is_primary) || safeLocations[0];
  
  // Check if user can edit ID (Business or Enterprise plan)
  const canEditId = activeBusiness?.plan === 'business' || activeBusiness?.plan === 'enterprise';
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<typeof mockClients[0] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<typeof locations[0] | null>(null);
  const [documentId, setDocumentId] = useState(generateId(isTransfer ? 'TRF-' : 'ORD-'));
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [selectedTransport, setSelectedTransport] = useState<TransportMode | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [notes, setNotes] = useState('');
  
  // Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Search states for modals
  const [clientSearch, setClientSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  
  // Get all products from mock data
  const allProducts = useMemo(() => {
    return mockBrands.flatMap((brand) => 
      brand.products.map((product) => ({
        ...product,
        brandName: brand.name,
      }))
    );
  }, []);

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
    if (!clientSearch) return mockClients;
    const searchLower = clientSearch.toLowerCase();
    return mockClients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchLower) ||
        client.address.toLowerCase().includes(searchLower) ||
        client.type.toLowerCase().includes(searchLower)
    );
  }, [clientSearch]);

  // Filtered staff based on search
  const filteredStaff = useMemo(() => {
    if (!staffSearch) return mockStaff;
    const searchLower = staffSearch.toLowerCase();
    return mockStaff.filter(
      (staff) =>
        staff.name.toLowerCase().includes(searchLower) ||
        staff.role.toLowerCase().includes(searchLower)
    );
  }, [staffSearch]);
  
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

  // Handle item toggle
  const handleToggleItem = (product: any) => {
    const existingIndex = selectedItems.findIndex((item) => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      setSelectedItems((prev) => prev.filter((item) => item.product_id !== product.id));
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
        },
      ]);
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
          onPress: () => {
            // TODO: Save to store
            console.log('Creating:', {
              type: isTransfer ? 'transfer' : 'delivery',
              id: documentId,
              client: selectedClient,
              location: selectedLocation,
              items: selectedItems,
              scheduledDate,
              transport: selectedTransport,
              staff: selectedStaff,
              notes,
            });
            setSuccessMessage(`${isTransfer ? 'Transfer' : 'Delivery'} created successfully!`);
            setShowSuccessDialog(true);
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
            onPress={() => setShowTransportModal(true)}
            containerStyle={styles.fieldContainer}
          />

          {/* Assign Staff */}
          <AppTextField
            label="Assign Staff"
            value={selectedStaff?.name || ''}
            onChangeText={() => {}}
            placeholder="Select staff member"
            leftIcon="person-outline"
            isDropdown
            onPress={() => setShowStaffModal(true)}
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
          style={[styles.createButton, { backgroundColor: appTheme.colors.primary }]}
          onPress={handleCreate}
        >
          <Text style={[styles.createButtonText, { fontFamily: theme.fonts.primary.bold }]}>
            {isTransfer ? 'Create Transfer' : 'Create Delivery'}
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
            <View style={{ height: 20 }} />
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
            <View style={{ height: 20 }} />
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
      >
        <View style={styles.bottomSheetContent}>
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
          
          <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
            {filteredProducts.map((product) => {
              const quantity = getItemQuantity(product.id);
              const isSelected = quantity > 0;

              return (
                <View
                  key={product.id}
                  style={[
                    styles.productItem,
                    { 
                      backgroundColor: appTheme.colors.cardBackground, 
                      borderColor: isSelected ? appTheme.colors.primary : appTheme.colors.borderColor,
                    },
                  ]}
                >
                  <View style={styles.productInfo}>
                    <Text style={[styles.productBrand, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.medium }]}>
                      {product.brandName}
                    </Text>
                    <Text style={[styles.productName, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.semiBold }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={[styles.productPrice, { color: appTheme.colors.primary, fontFamily: theme.fonts.primary.bold }]}>
                      {formatCurrency(product.price)}
                    </Text>
                  </View>

                  {isSelected ? (
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={[styles.quantityButton, { backgroundColor: appTheme.colors.surface }]}
                        onPress={() => handleQuantityChange(product.id, quantity - 1)}
                      >
                        <Icon name="remove" size={18} color={appTheme.colors.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.quantityText, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.bold }]}>
                        {quantity}
                      </Text>
                      <TouchableOpacity
                        style={[styles.quantityButton, { backgroundColor: appTheme.colors.surface }]}
                        onPress={() => handleQuantityChange(product.id, quantity + 1)}
                      >
                        <Icon name="add" size={18} color={appTheme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addItemButton, { backgroundColor: appTheme.colors.primary }]}
                      onPress={() => handleToggleItem(product)}
                    >
                      <Icon name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
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
            <View style={{ height: 40 }} />
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
        title="Select Transport"
      >
        <View style={styles.bottomSheetContent}>
          <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
            {mockTransportModes.map((item, index) => (
              <ListItemCard
                key={item.id}
                avatar={{
                  type: 'icon',
                  icon: item.icon,
                  iconColor: '#FFFFFF',
                  backgroundColor: appTheme.colors.info,
                }}
                title={item.name}
                onPress={() => {
                  setSelectedTransport(item);
                  setShowTransportModal(false);
                }}
                selected={selectedTransport?.id === item.id}
                showCheckmark
                showDivider={index < mockTransportModes.length - 1}
              />
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </AppBottomSheet>

      {/* Staff Selection Modal */}
      <AppBottomSheet
        visible={showStaffModal}
        onClose={() => {
          setShowStaffModal(false);
          setStaffSearch('');
        }}
        title="Assign Staff"
      >
        <View style={styles.bottomSheetContent}>
          <AppSearchBar
            placeholder="Search staff..."
            value={staffSearch}
            onChangeText={setStaffSearch}
            onClear={() => setStaffSearch('')}
            containerStyle={styles.searchBarContainer}
          />
          <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
            {filteredStaff.map((item, index) => (
              <ListItemCard
                key={item.id}
                avatar={{
                  type: 'initials',
                  userId: item.id,
                  userName: item.name,
                }}
                title={item.name}
                subtitle={item.role}
                onPress={() => {
                  setSelectedStaff(item);
                  setShowStaffModal(false);
                  setStaffSearch('');
                }}
                selected={selectedStaff?.id === item.id}
                showCheckmark
                showDivider={index < filteredStaff.length - 1}
              />
            ))}
            {filteredStaff.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="people-outline" size={40} color={appTheme.colors.textLight} />
                <Text style={[styles.emptyText, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                  No staff found
                </Text>
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </AppBottomSheet>

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
  searchBarContainer: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  modalScrollList: {
    maxHeight: 400,
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
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  summaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryCount: {
    fontSize: 15,
  },
  summaryTotal: {
    fontSize: 16,
  },
  doneButton: {
    paddingHorizontal: 24,
    height: 40,
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
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  productInfo: {
    flex: 1,
  },
  productBrand: {
    fontSize: 11,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 15,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  addItemButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
