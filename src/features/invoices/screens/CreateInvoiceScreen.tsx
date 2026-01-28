import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import SecondaryHeader from '@/shared/components/layout/headers/SecondaryHeader';
import AppButton from '@/shared/components/ui/AppButton';
import AppTextField from '@/shared/components/ui/AppTextField';
import ImagePlaceholder from '@/shared/components/ui/ImagePlaceholder';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import AccordionSection from '@/shared/components/ui/AccordionSection';
import ColorPicker from '@/shared/components/ui/ColorPicker';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { AppModal, AppBottomSheet, AppSearchBar, DateSelector, ListItemCard } from '@/shared/components/ui';
import { mockBrands } from '@/shared/data/businessProfile';
import { formatCurrency } from '@/shared/data/mockOrders';

// Mock connected businesses for client selection
const mockConnectedBusinesses = [
  { id: 'biz-001', name: 'FreshMart Retailers', type: 'Retailer', address: 'Port Louis, Mauritius' },
  { id: 'biz-002', name: 'Tech Haven Store', type: 'Electronics', address: 'Curepipe, Mauritius' },
  { id: 'biz-003', name: 'GreenLife Supermarket', type: 'Supermarket', address: 'Rose Hill, Mauritius' },
  { id: 'biz-004', name: 'Island Electronics', type: 'Electronics', address: 'Quatre Bornes, Mauritius' },
  { id: 'biz-005', name: 'Corner Shop Mauritius', type: 'Convenience', address: 'Vacoas, Mauritius' },
];

// Item type for selection
interface SelectedItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

type ValidationError = {
  field: string;
  message: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'CreateInvoice'>;

export default function CreateInvoiceScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const initialDocumentType = route.params?.type || 'Invoice';
  const [documentType, setDocumentType] = useState(initialDocumentType);
  const isInvoice = documentType === 'Invoice';
  const scrollViewRef = useRef<ScrollView>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  
  // State for the different sections
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);

  // Client & Dates Section
  const [selectedClient, setSelectedClient] = useState<typeof mockConnectedBusinesses[0] | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [issueDate, setIssueDate] = useState(new Date());
  const [showIssueDateModal, setShowIssueDateModal] = useState(false);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const referenceInputRef = useRef<TextInput>(null);

  // Line Items Section
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [focusedProductId, setFocusedProductId] = useState<string | null>(null);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [editedProducts, setEditedProducts] = useState<Set<string>>(new Set());
  const productInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const animationRefs = useRef<{ [key: string]: Animated.Value }>({});

  // Summary & Totals Section
  const [subtotal, setSubtotal] = useState(0);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [totalTax, setTotalTax] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [total, setTotal] = useState(0);

  // Notes & Terms Section
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // Template Settings Section
  const [footerText, setFooterText] = useState(isInvoice ? 'Payment due within 30 days' : 'This estimate is valid for 30 days');

  // Permissions & Options Section
  const [isPublic, setIsPublic] = useState(false);
  const [allowPartialPayments, setAllowPartialPayments] = useState(false);
  const [autoReminder, setAutoReminder] = useState(false);
  const [reminderDays, setReminderDays] = useState('3');

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    clientDates: true,
    lineItems: true,
    summary: true,
    notes: true,
    template: false,
    permissions: false,
  });
  
  // Success dialog state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Filtered clients based on search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return mockConnectedBusinesses;
    const searchLower = clientSearch.toLowerCase();
    return mockConnectedBusinesses.filter(
      (client) =>
        client.name.toLowerCase().includes(searchLower) ||
        client.address.toLowerCase().includes(searchLower) ||
        client.type.toLowerCase().includes(searchLower)
    );
  }, [clientSearch]);

  // Get all products from mock data
  const allProducts = useMemo(() => {
    return mockBrands.flatMap((brand) => 
      brand.products.map((product) => ({
        ...product,
        brandName: brand.name,
      }))
    );
  }, []);

  // Check if form is complete for enabling Send button
  const isFormComplete = useMemo(() => {
    return selectedClient !== null && selectedItems.length > 0;
  }, [selectedClient, selectedItems]);

  // Format date for display
  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  // Handle Reference PO# focus to scroll into view
  const handleReferenceFieldFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 280, animated: true });
    }, 300);
  };

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

  // Calculate totals from selected items
  const orderTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [selectedItems]);

  const totalItemsCount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedItems]);

  // Calculate the totals whenever line items change
  useEffect(() => {
    calculateTotals();
  }, [selectedItems, globalDiscount, globalDiscountType, shipping]);

  const calculateTotals = () => {
    const calculatedSubtotal = orderTotal;
    
    let discountAmount = 0;
    if (globalDiscountType === 'percentage') {
      discountAmount = calculatedSubtotal * (globalDiscount / 100);
    } else {
      discountAmount = globalDiscount;
    }
    
    const calculatedTotal = calculatedSubtotal - discountAmount + totalTax + shipping;
    
    setSubtotal(calculatedSubtotal);
    setTotal(calculatedTotal);
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
      productInputRefs.current[product.id]?.focus();
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

  const toggleSectionExpanded = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleSelectLogo = (uri: string) => {
    setLogoUri(uri);
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];
    
    if (!selectedClient) {
      newErrors.push({ field: 'client', message: 'Please select a client' });
    }
    
    if (selectedItems.length === 0) {
      newErrors.push({ field: 'items', message: 'Please add at least one item' });
    }
    
    setErrors(newErrors);
    
    if (newErrors.length > 0) {
      const firstError = newErrors[0];
      if (firstError.field === 'client') {
        toggleSectionExpanded('clientDates');
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else if (firstError.field === 'items') {
        toggleSectionExpanded('lineItems');
        scrollViewRef.current?.scrollTo({ y: 200, animated: true });
      }
    }
    
    return newErrors.length === 0;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }
    setIsSaving(true);
    try {
      setSuccessMessage(`${documentType} saved as draft`);
      setShowSuccessDialog(true);
    } catch (error) {
      Alert.alert('Error', `Failed to save ${documentType.toLowerCase()}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before previewing');
      return;
    }
    Alert.alert('Preview', `Preview ${documentType}`);
  };

  const handleSend = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before sending');
      return;
    }
    setIsSending(true);
    try {
      setSuccessMessage(`${documentType} sent to client`);
      setShowSuccessDialog(true);
    } catch (error) {
      Alert.alert('Error', `Failed to send ${documentType.toLowerCase()}. Please try again.`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader
          title={`Create ${documentType}`}
          leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack() }}
        />
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          {/* Client & Dates Section */}
          <AccordionSection 
            title="Client & Dates"
            isExpanded={expandedSections.clientDates}
            onToggle={() => toggleSectionExpanded('clientDates')}
          >
            <AppTextField
              label="Client"
              value={selectedClient?.name || ''}
              onChangeText={() => {}}
              placeholder="Select a client"
              leftIcon="business-outline"
              isDropdown
              onPress={() => setShowClientModal(true)}
              error={errors.some(e => e.field === 'client')}
              containerStyle={styles.fieldMargin}
            />

            <AppTextField
              label="Issue Date"
              value={formatDateDisplay(issueDate)}
              onChangeText={() => {}}
              placeholder="Select issue date"
              leftIcon="calendar-outline"
              isDropdown
              onPress={() => setShowIssueDateModal(true)}
              containerStyle={styles.fieldMargin}
            />

            <AppTextField
              label={isInvoice ? 'Due Date' : 'Expiry Date'}
              value={formatDateDisplay(dueDate)}
              onChangeText={() => {}}
              placeholder="Select date"
              leftIcon="calendar-outline"
              isDropdown
              onPress={() => setShowDueDateModal(true)}
              containerStyle={styles.fieldMargin}
            />

            <AppTextField
              label="Reference PO# (Optional)"
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              placeholder="Enter reference number"
              containerStyle={styles.fieldMargin}
              onFocus={handleReferenceFieldFocus}
            />
          </AccordionSection>

          {/* Line Items Section */}
          <AccordionSection 
            title="Line Items" 
            isExpanded={expandedSections.lineItems}
            onToggle={() => toggleSectionExpanded('lineItems')}
          >
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
                <View style={[styles.itemsTotal, { borderTopColor: appTheme.colors.borderColor }]}>
                  <Text style={[styles.itemsTotalLabel, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.medium }]}>
                    {totalItemsCount} items
                  </Text>
                  <Text style={[styles.itemsTotalValue, { color: appTheme.colors.primary, fontFamily: theme.fonts.primary.bold }]}>
                    {formatCurrency(orderTotal)}
                  </Text>
                </View>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.addItemButton, { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor }]}
              onPress={() => setShowItemsModal(true)}
            >
              <Text style={[styles.addItemButtonText, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.semiBold }]}>
                {selectedItems.length === 0 ? 'Add an item' : 'Add another item'}
              </Text>
            </TouchableOpacity>
          </AccordionSection>

          {/* Summary & Totals Section */}
          <AccordionSection 
            title="Summary & Totals" 
            isExpanded={expandedSections.summary}
            onToggle={() => toggleSectionExpanded('summary')}
          >
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: appTheme.colors.textLight }]}>Subtotal</Text>
              <Text style={[styles.totalValue, { color: appTheme.colors.text }]}>${subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.discountRow}>
              <AppTextField
                label={`Discount ${globalDiscountType === 'percentage' ? '(%)' : '($)'}`}
                value={globalDiscount.toString()}
                onChangeText={(value) => setGlobalDiscount(parseFloat(value) || 0)}
                keyboardType="numeric"
                placeholder="0"
                containerStyle={{ flex: 1, marginBottom: 16 }}
              />
              <TouchableOpacity 
                style={[styles.discountTypeButton, { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor }]}
                onPress={() => setGlobalDiscountType(globalDiscountType === 'percentage' ? 'fixed' : 'percentage')}
              >
                <Text style={{ color: appTheme.colors.text }}>{globalDiscountType === 'percentage' ? '%' : '$'}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: appTheme.colors.textLight }]}>Tax</Text>
              <Text style={[styles.totalValue, { color: appTheme.colors.text }]}>${totalTax.toFixed(2)}</Text>
            </View>
            
            <AppTextField
              label="Shipping"
              value={shipping.toString()}
              onChangeText={(value) => setShipping(parseFloat(value) || 0)}
              keyboardType="numeric"
              placeholder="0.00"
              containerStyle={styles.fieldMargin}
            />
            
            <View style={styles.totalRow}>
              <Text style={[styles.grandTotalLabel, { color: appTheme.colors.text }]}>Total</Text>
              <Text style={[styles.grandTotalValue, { color: appTheme.colors.text }]}>${total.toFixed(2)}</Text>
            </View>
          </AccordionSection>

          {/* Notes & Terms Section */}
          <AccordionSection 
            title="Notes & Terms" 
            isExpanded={expandedSections.notes}
            onToggle={() => toggleSectionExpanded('notes')}
          >
            <AppTextField
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter notes for your client"
              isMultiline
              minHeight={48}
              containerStyle={styles.fieldMargin}
            />
            
            <AppTextField
              label="Terms & Conditions"
              value={terms}
              onChangeText={setTerms}
              placeholder="Enter terms and conditions"
              isMultiline
              minHeight={48}
              containerStyle={styles.fieldMargin}
            />
          </AccordionSection>

          {/* Template Settings Section */}
          <AccordionSection 
            title="Template Settings" 
            isExpanded={expandedSections.template}
            onToggle={() => toggleSectionExpanded('template')}
          >
            <View style={styles.fieldMargin}>
              <Text style={[styles.label, { color: appTheme.colors.textLight }]}>Business Logo</Text>
              <ImagePlaceholder
                text="Tap to add logo"
                onPress={handleSelectLogo}
                imageUri={logoUri}
                style={styles.logoPlaceholder}
                iconName="image-outline"
              />
            </View>
            
            <View style={styles.fieldMargin}>
              <Text style={[styles.label, { color: appTheme.colors.textLight }]}>Primary Color</Text>
              <TouchableOpacity 
                style={[styles.colorPreview, { backgroundColor: primaryColor }]}
                onPress={() => setIsColorPickerVisible(true)}
              />
            </View>
            
            <AppTextField
              label="Footer Text"
              value={footerText}
              onChangeText={setFooterText}
              placeholder="Enter footer text"
              containerStyle={styles.fieldMargin}
            />
          </AccordionSection>

          {/* Permissions & Options Section */}
          <AccordionSection 
            title="Permissions & Options" 
            isExpanded={expandedSections.permissions}
            onToggle={() => toggleSectionExpanded('permissions')}
          >
            <View style={styles.toggleOption}>
              <Text style={[styles.toggleLabel, { color: appTheme.colors.text }]}>Make Public (shared link)</Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E9E9EA"
              />
            </View>
            
            {isInvoice && (
              <View style={styles.toggleOption}>
                <Text style={[styles.toggleLabel, { color: appTheme.colors.text }]}>Allow partial payments</Text>
                <Switch
                  value={allowPartialPayments}
                  onValueChange={setAllowPartialPayments}
                  trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E9E9EA"
                />
              </View>
            )}
            
            <View style={styles.toggleOption}>
              <Text style={[styles.toggleLabel, { color: appTheme.colors.text }]}>Auto-reminder</Text>
              <Switch
                value={autoReminder}
                onValueChange={setAutoReminder}
                trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E9E9EA"
              />
            </View>
            
            {autoReminder && (
              <AppTextField
                label="Reminder days before due"
                value={reminderDays}
                onChangeText={setReminderDays}
                keyboardType="numeric"
                placeholder="3"
                containerStyle={styles.fieldMargin}
              />
            )}
          </AccordionSection>

          <View style={styles.footerSpacer} />
        </ScrollView>

        {/* Sticky Footer */}
        <View style={[styles.stickyFooter, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
          <View style={styles.footerButtonRow}>
            <AppButton
              title="Save Draft"
              onPress={handleSaveDraft}
              variant="outline"
              style={styles.footerButtonHalf}
              loading={isSaving}
              disabled={isSaving || isSending}
            />
            <AppButton
              title="Preview"
              onPress={handlePreview}
              variant="outline"
              style={styles.footerButtonHalf}
              disabled={isSaving || isSending}
            />
          </View>
          <AppButton
            title={`Send ${documentType}`}
            onPress={handleSend}
            variant="primary"
            loading={isSending}
            disabled={!isFormComplete || isSaving || isSending}
          />
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
              {filteredClients.map((client, index) => (
                <ListItemCard
                  key={client.id}
                  avatar={{
                    type: 'initials',
                    userName: client.name,
                    userId: client.id,
                  }}
                  title={client.name}
                  subtitle={`${client.type} • ${client.address}`}
                  onPress={() => {
                    setSelectedClient(client);
                    setShowClientModal(false);
                    setClientSearch('');
                  }}
                  selected={selectedClient?.id === client.id}
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

        {/* Issue Date Modal */}
        <AppBottomSheet
          visible={showIssueDateModal}
          onClose={() => setShowIssueDateModal(false)}
          title="Select Issue Date"
        >
          <View style={styles.dateModalContent}>
            <DateSelector
              value={issueDate}
              onChange={(date) => {
                setIssueDate(date);
              }}
              calendarHeight={340}
            />
            <View style={styles.dateModalActions}>
              <TouchableOpacity
                style={[styles.dateModalButton, styles.dateCancelButton, { borderColor: appTheme.colors.borderColor }]}
                onPress={() => setShowIssueDateModal(false)}
              >
                <Text style={[styles.dateCancelText, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.medium }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateModalButton, styles.dateConfirmButton, { backgroundColor: appTheme.colors.primary }]}
                onPress={() => setShowIssueDateModal(false)}
              >
                <Text style={[styles.dateConfirmText, { fontFamily: theme.fonts.primary.bold }]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </AppBottomSheet>

        {/* Due/Expiry Date Modal */}
        <AppBottomSheet
          visible={showDueDateModal}
          onClose={() => setShowDueDateModal(false)}
          title={isInvoice ? 'Select Due Date' : 'Select Expiry Date'}
        >
          <View style={styles.dateModalContent}>
            <DateSelector
              value={dueDate}
              onChange={(date) => {
                setDueDate(date);
              }}
              minDate={issueDate}
              calendarHeight={340}
            />
            <View style={styles.dateModalActions}>
              <TouchableOpacity
                style={[styles.dateModalButton, styles.dateCancelButton, { borderColor: appTheme.colors.borderColor }]}
                onPress={() => setShowDueDateModal(false)}
              >
                <Text style={[styles.dateCancelText, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.medium }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateModalButton, styles.dateConfirmButton, { backgroundColor: appTheme.colors.primary }]}
                onPress={() => setShowDueDateModal(false)}
              >
                <Text style={[styles.dateConfirmText, { fontFamily: theme.fonts.primary.bold }]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
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
                              ref={(ref) => { productInputRefs.current[product.id] = ref; }}
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
                          style={[styles.addProductButton, { backgroundColor: appTheme.colors.primary }]}
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

        {/* Color Picker Modal */}
        {isColorPickerVisible && (
          <Modal
            visible={isColorPickerVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsColorPickerVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setIsColorPickerVisible(false)}
            >
              <View style={[styles.modalContainer, { backgroundColor: appTheme.colors.cardBackground }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>Select Color</Text>
                  <TouchableOpacity onPress={() => setIsColorPickerVisible(false)}>
                    <Icon name="close" size={24} color={appTheme.colors.iconColor} />
                  </TouchableOpacity>
                </View>
                
                <ColorPicker
                  onColorSelected={(color) => {
                    setPrimaryColor(color);
                    setIsColorPickerVisible(false);
                  }}
                  initialColor={primaryColor}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        )}

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 16,
    paddingBottom: 80,
  },
  fieldMargin: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    fontFamily: theme.fonts.primary.medium,
  },
  rowFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 1,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  discountTypeButton: {
    borderWidth: 1,
    borderRadius: 8,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemsPreview: {
    marginBottom: 16,
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
  itemsTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  itemsTotalLabel: {
    fontSize: 14,
  },
  itemsTotalValue: {
    fontSize: 16,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addItemButtonText: {
    fontSize: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.primary.medium,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.primary.bold,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.primary.bold,
  },
  toggleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  colorPreview: {
    height: 40,
    borderRadius: 8,
    marginBottom: 8,
  },
  logoPlaceholder: {
    height: 80,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.primary.bold,
  },
  footerSpacer: {
    height: 200,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    padding: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    gap: 10,
  },
  footerButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footerButtonHalf: {
    flex: 1,
  },
  // Bottom sheet content
  bottomSheetContent: {
    maxHeight: 500,
  },
  bottomSheetContentFullHeight: {
    flex: 1,
  },
  searchBarContainer: {
    marginHorizontal: 0,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  modalScrollList: {
    maxHeight: 400,
  },
  modalScrollListFullHeight: {
    flex: 1,
  },
  // Items modal specific
  itemsSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    marginHorizontal: 12,
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
  removeItemButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addProductButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  // Client selection modal
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  clientAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clientContent: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    marginBottom: 4,
  },
  clientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clientTypeBadgeText: {
    fontSize: 11,
  },
  clientAddress: {
    fontSize: 13,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Date modal
  dateModalContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  dateModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  dateModalButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCancelButton: {
    borderWidth: 1,
  },
  dateCancelText: {
    fontSize: 15,
  },
  dateConfirmButton: {},
  dateConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
