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
  Modal,
  FlatList,
} from 'react-native';
import AppTextField from '@/shared/components/ui/AppTextField';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useCompanyStore } from '@/shared/store/companyStore';
import { RootStackParamList } from '@/shared/types/navigation';
import { mockStaff, mockTransportModes, Staff, TransportMode } from '@/shared/data/mockDeliveries';
import { mockBrands } from '@/shared/data/businessProfile';
import { formatCurrency } from '@/shared/data/mockOrders';
import { ConfirmationDialog } from '@/shared/components/ui';

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
  const { locations, currentLocation } = useCompanyStore();
  
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  
  // Get all products from mock data
  const allProducts = useMemo(() => {
    return mockBrands.flatMap((brand) => 
      brand.products.map((product) => ({
        ...product,
        brandName: brand.name,
      }))
    );
  }, []);
  
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

  // Handle date change
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setScheduledDate(date);
    }
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


  // Render bottom sheet modal
  const renderModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    children: React.ReactNode
  ) => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: appTheme.colors.background }]}>
          {/* Handle */}
          <View style={styles.modalHandle}>
            <View style={[styles.handleBar, { backgroundColor: appTheme.colors.borderColor }]} />
          </View>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.bold }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color={appTheme.colors.iconColor} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: appTheme.colors.cardBackground, borderBottomColor: appTheme.colors.borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name="chevron-back" size={24} color={appTheme.colors.iconColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.bold }]}>
          {isTransfer ? 'Create Transfer' : 'Create Delivery'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {/* Mode Badge */}
      <View style={styles.modeBadgeContainer}>
        <View style={[styles.modeBadge, { backgroundColor: isTransfer ? `${appTheme.colors.warning}20` : `${appTheme.colors.info}20` }]}>
          <Icon
            name={isTransfer ? 'swap-horizontal' : 'car'}
            size={18}
            color={isTransfer ? appTheme.colors.warning : appTheme.colors.info}
          />
          <Text style={[styles.modeBadgeText, { color: isTransfer ? appTheme.colors.warning : appTheme.colors.info, fontFamily: theme.fonts.primary.medium }]}>
            {isTransfer ? 'Internal Transfer' : 'External Delivery'}
          </Text>
        </View>
      </View>

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
            <View style={styles.fieldLabelRow}>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.textFieldLabelDefault, fontFamily: theme.fonts.primary.medium, marginBottom: 8, marginLeft: 8 }]}>
                {isTransfer ? 'Transfer ID' : 'Order ID'}
              </Text>
              {!canEditId && (
                <View style={[styles.lockBadge, { backgroundColor: appTheme.colors.lightGrey }]}>
                  <Icon name="lock-closed" size={12} color={appTheme.colors.textLight} />
                  <Text style={[styles.lockText, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                    Upgrade to edit
                  </Text>
                </View>
              )}
            </View>
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
            onPress={() => setShowDatePicker(true)}
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
            numberOfLines={4}
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
          <Icon name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={[styles.createButtonText, { fontFamily: theme.fonts.primary.bold }]}>
            {isTransfer ? 'Create Transfer' : 'Create Delivery'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Client Selection Modal */}
      {renderModal(showClientModal, () => setShowClientModal(false), 'Select Client', (
        <FlatList
          data={mockClients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.listItem, selectedClient?.id === item.id && styles.listItemSelected, { borderBottomColor: appTheme.colors.borderColor }]}
              onPress={() => {
                setSelectedClient(item);
                setShowClientModal(false);
              }}
            >
              <View style={[styles.listItemAvatar, { backgroundColor: '#4ECDC4' }]}>
                <Text style={styles.listItemAvatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.bold }]}>
                  {item.name}
                </Text>
                <Text style={[styles.listItemSubtitle, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                  {item.address}
                </Text>
              </View>
              {selectedClient?.id === item.id && (
                <Icon name="checkmark-circle" size={24} color={appTheme.colors.success} />
              )}
            </TouchableOpacity>
          )}
          style={styles.modalList}
        />
      ))}

      {/* Location Selection Modal */}
      {renderModal(showLocationModal, () => setShowLocationModal(false), 'Select Destination', (
        <FlatList
          data={locations.filter(loc => loc.id !== currentLocation?.id)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.listItem, selectedLocation?.id === item.id && styles.listItemSelected, { borderBottomColor: appTheme.colors.borderColor }]}
              onPress={() => {
                setSelectedLocation(item);
                setShowLocationModal(false);
              }}
            >
              <View style={[styles.listItemAvatar, { backgroundColor: '#EAB308' }]}>
                <Icon name="location" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.bold }]}>
                  {item.name}
                </Text>
                <Text style={[styles.listItemSubtitle, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                  {item.address}
                </Text>
              </View>
              {selectedLocation?.id === item.id && (
                <Icon name="checkmark-circle" size={24} color={appTheme.colors.success} />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Icon name="location-outline" size={48} color={appTheme.colors.textLight} />
              <Text style={[styles.emptyText, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                No other locations available.{'\n'}Add more locations in settings.
              </Text>
            </View>
          )}
          style={styles.modalList}
        />
      ))}

      {/* Items Selection Modal */}
      {renderModal(showItemsModal, () => setShowItemsModal(false), 'Select Items', (
        <View style={styles.itemsModalContent}>
          {selectedItems.length > 0 && (
            <View style={[styles.itemsSummary, { backgroundColor: appTheme.colors.surface }]}>
              <Text style={[styles.itemsSummaryText, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.medium }]}>
                {totalItemsCount} items • {formatCurrency(orderTotal)}
              </Text>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: appTheme.colors.primary }]}
                onPress={() => setShowItemsModal(false)}
              >
                <Text style={[styles.doneButtonText, { fontFamily: theme.fonts.primary.bold }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {mockBrands.map((brand) => (
              <View key={brand.id} style={styles.brandSection}>
                <TouchableOpacity
                  style={[styles.brandHeader, { backgroundColor: appTheme.colors.surface }]}
                  onPress={() => setExpandedBrand(expandedBrand === brand.id ? null : brand.id)}
                >
                  <Text style={[styles.brandName, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.bold }]}>
                    {brand.name}
                  </Text>
                  <View style={styles.brandRight}>
                    <Text style={[styles.brandCount, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                      {brand.products.length} products
                    </Text>
                    <Icon
                      name={expandedBrand === brand.id ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={appTheme.colors.textLight}
                    />
                  </View>
                </TouchableOpacity>

                {expandedBrand === brand.id && (
                  <View style={styles.productsContainer}>
                    {brand.products.map((product) => {
                      const quantity = getItemQuantity(product.id);
                      const isSelected = quantity > 0;

                      return (
                        <View
                          key={product.id}
                          style={[
                            styles.productCard,
                            { backgroundColor: appTheme.colors.cardBackground, borderColor: isSelected ? appTheme.colors.success : appTheme.colors.borderColor },
                            isSelected && styles.productCardSelected,
                          ]}
                        >
                          <View style={styles.productInfo}>
                            <Text style={[styles.productName, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.medium }]} numberOfLines={1}>
                              {product.name}
                            </Text>
                            <Text style={[styles.productPrice, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
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
                  </View>
                )}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      ))}

      {/* Transport Selection Modal */}
      {renderModal(showTransportModal, () => setShowTransportModal(false), 'Select Transport', (
        <FlatList
          data={mockTransportModes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.listItem, selectedTransport?.id === item.id && styles.listItemSelected, { borderBottomColor: appTheme.colors.borderColor }]}
              onPress={() => {
                setSelectedTransport(item);
                setShowTransportModal(false);
              }}
            >
              <View style={[styles.listItemAvatar, { backgroundColor: appTheme.colors.info }]}>
                <Icon name={item.icon as any} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.bold }]}>
                  {item.name}
                </Text>
              </View>
              {selectedTransport?.id === item.id && (
                <Icon name="checkmark-circle" size={24} color={appTheme.colors.success} />
              )}
            </TouchableOpacity>
          )}
          style={styles.modalList}
        />
      ))}

      {/* Staff Selection Modal */}
      {renderModal(showStaffModal, () => setShowStaffModal(false), 'Assign Staff', (
        <FlatList
          data={mockStaff}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.listItem, selectedStaff?.id === item.id && styles.listItemSelected, { borderBottomColor: appTheme.colors.borderColor }]}
              onPress={() => {
                setSelectedStaff(item);
                setShowStaffModal(false);
              }}
            >
              <View style={[styles.listItemAvatar, { backgroundColor: '#6366F1' }]}>
                <Text style={styles.listItemAvatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.bold }]}>
                  {item.name}
                </Text>
                <Text style={[styles.listItemSubtitle, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.regular }]}>
                  {item.role}
                </Text>
              </View>
              {selectedStaff?.id === item.id && (
                <Icon name="checkmark-circle" size={24} color={appTheme.colors.success} />
              )}
            </TouchableOpacity>
          )}
          style={styles.modalList}
        />
      ))}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={scheduledDate}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Success Dialog */}
      <ConfirmationDialog
        visible={showSuccessDialog}
        variant="success"
        title="Success"
        message={successMessage}
        primaryButtonText="OK"
        onPrimaryAction={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
        onClose={() => {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBadgeContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  modeBadgeText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  notesInput: {
    height: 100,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 8,
    gap: 10,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalList: {
    paddingHorizontal: 16,
    maxHeight: 400,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  listItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  listItemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  // Items modal specific
  itemsModalContent: {
    flex: 1,
    maxHeight: 500,
  },
  itemsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  itemsSummaryText: {
    fontSize: 15,
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
  brandSection: {
    marginTop: 12,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
  },
  brandName: {
    fontSize: 15,
  },
  brandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandCount: {
    fontSize: 13,
  },
  productsContainer: {
    paddingTop: 8,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    marginLeft: 12,
    borderWidth: 1,
  },
  productCardSelected: {
    borderWidth: 1,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 13,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 15,
    minWidth: 24,
    textAlign: 'center',
  },
  addItemButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


