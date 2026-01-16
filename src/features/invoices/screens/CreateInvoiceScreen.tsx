import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { AppModal } from '@/shared/components/ui';

type InvoiceItemType = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  taxRate: number;
  total: number;
};

type ValidationError = {
  field: string;
  message: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'CreateInvoice'>;

export default function CreateInvoiceScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
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
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState('');

  // Line Items Section
  const [lineItems, setLineItems] = useState<InvoiceItemType[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 'percentage',
      taxRate: 0,
      total: 0,
    },
  ]);

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

  // Calculate the totals whenever line items change
  useEffect(() => {
    calculateTotals();
  }, [lineItems, globalDiscount, globalDiscountType, shipping]);

  const calculateTotals = () => {
    const calculatedSubtotal = lineItems.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineDiscount = item.discountType === 'percentage' 
        ? lineSubtotal * (item.discount / 100) 
        : item.discount;
      return sum + (lineSubtotal - lineDiscount);
    }, 0);
    
    const calculatedTotalTax = lineItems.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineDiscount = item.discountType === 'percentage' 
        ? lineSubtotal * (item.discount / 100) 
        : item.discount;
      return sum + ((lineSubtotal - lineDiscount) * (item.taxRate / 100));
    }, 0);
    
    let discountAmount = 0;
    if (globalDiscountType === 'percentage') {
      discountAmount = calculatedSubtotal * (globalDiscount / 100);
    } else {
      discountAmount = globalDiscount;
    }
    
    const calculatedTotal = calculatedSubtotal - discountAmount + calculatedTotalTax + shipping;
    
    setSubtotal(calculatedSubtotal);
    setTotalTax(calculatedTotalTax);
    setTotal(calculatedTotal);
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

  const handleAddLineItem = () => {
    setLineItems(prev => [
      ...prev,
      {
        id: `${prev.length + 1}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        discountType: 'percentage',
        taxRate: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length === 1) {
      Alert.alert('Cannot remove', 'You need at least one line item');
      return;
    }
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof InvoiceItemType, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updatedItem = { ...item, [field]: value };
      
      let lineDiscount = 0;
      if (updatedItem.discountType === 'percentage') {
        lineDiscount = (updatedItem.quantity * updatedItem.unitPrice) * (updatedItem.discount / 100);
      } else {
        lineDiscount = updatedItem.discount;
      }
      
      const lineSubtotal = (updatedItem.quantity * updatedItem.unitPrice) - lineDiscount;
      const lineTax = lineSubtotal * (updatedItem.taxRate / 100);
      const lineTotal = lineSubtotal + lineTax;
      
      return {
        ...updatedItem,
        total: lineTotal
      };
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];
    
    if (!selectedClient) {
      newErrors.push({ field: 'client', message: 'Please select a client' });
    }
    
    if (!issueDate) {
      newErrors.push({ field: 'issueDate', message: 'Please enter an issue date' });
    }
    
    if (!dueDate) {
      newErrors.push({ field: 'dueDate', message: `Please enter a ${isInvoice ? 'due' : 'expiry'} date` });
    }
    
    lineItems.forEach((item, index) => {
      if (!item.description) {
        newErrors.push({ field: `item-${index}-description`, message: `Item ${index + 1}: Description is required` });
      }
      if (item.quantity <= 0) {
        newErrors.push({ field: `item-${index}-quantity`, message: `Item ${index + 1}: Quantity must be greater than 0` });
      }
      if (item.unitPrice < 0) {
        newErrors.push({ field: `item-${index}-unitPrice`, message: `Item ${index + 1}: Unit price cannot be negative` });
      }
      if (item.discount < 0 || (item.discountType === 'percentage' && item.discount > 100)) {
        newErrors.push({ field: `item-${index}-discount`, message: `Item ${index + 1}: Invalid discount` });
      }
      if (item.taxRate < 0 || item.taxRate > 100) {
        newErrors.push({ field: `item-${index}-taxRate`, message: `Item ${index + 1}: Tax rate must be between 0% and 100%` });
      }
    });
    
    setErrors(newErrors);
    
    if (newErrors.length > 0) {
      const firstError = newErrors[0];
      if (firstError.field.startsWith('client') || firstError.field.startsWith('issue') || firstError.field.startsWith('due')) {
        toggleSectionExpanded('clientDates');
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else if (firstError.field.startsWith('item')) {
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
              value={selectedClient}
              onChangeText={() => {}}
              placeholder="Select a client"
              multiSelect
              selectedCount={selectedClient ? 1 : 0}
              countLabelSingular="client"
              onPress={() => Alert.alert('Select Client', 'Navigate to client selection')}
              error={errors.some(e => e.field === 'client')}
              containerStyle={styles.fieldMargin}
            />

            <AppTextField
              label="Issue Date"
              value={issueDate}
              onChangeText={setIssueDate}
              placeholder="YYYY-MM-DD"
              error={errors.some(e => e.field === 'issueDate')}
              containerStyle={styles.fieldMargin}
            />

            <AppTextField
              label={isInvoice ? 'Due Date' : 'Expiry Date'}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              error={errors.some(e => e.field === 'dueDate')}
              containerStyle={styles.fieldMargin}
            />

            <AppTextField
              label="Reference PO# (Optional)"
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              placeholder="Enter reference number"
              containerStyle={styles.fieldMargin}
            />
          </AccordionSection>

          {/* Line Items Section */}
          <AccordionSection 
            title="Line Items" 
            isExpanded={expandedSections.lineItems}
            onToggle={() => toggleSectionExpanded('lineItems')}
          >
            {lineItems.map((item, index) => (
              <View key={item.id} style={[styles.lineItemContainer, { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor }]}>
                <View style={styles.lineItemHeader}>
                  <Text style={[styles.lineItemTitle, { color: appTheme.colors.text }]}>Item {index + 1}</Text>
                  <TouchableOpacity onPress={() => handleRemoveLineItem(item.id)}>
                    <Icon name="trash-outline" size={20} color={appTheme.colors.error} />
                  </TouchableOpacity>
                </View>
                
                <AppTextField
                  label="Description"
                  value={item.description}
                  onChangeText={(value) => updateLineItem(item.id, 'description', value)}
                  placeholder="Enter description"
                  error={errors.some(e => e.field === `item-${index}-description`)}
                  containerStyle={styles.fieldMargin}
                />
                
                <View style={styles.rowFields}>
                  <View style={[styles.halfWidth, { marginRight: 8 }]}>
                    <AppTextField
                      label="Quantity"
                      value={item.quantity.toString()}
                      onChangeText={(value) => updateLineItem(item.id, 'quantity', parseFloat(value) || 0)}
                      keyboardType="numeric"
                      placeholder="0"
                      error={errors.some(e => e.field === `item-${index}-quantity`)}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <AppTextField
                      label="Unit Price"
                      value={item.unitPrice.toString()}
                      onChangeText={(value) => updateLineItem(item.id, 'unitPrice', parseFloat(value) || 0)}
                      keyboardType="numeric"
                      placeholder="0.00"
                      error={errors.some(e => e.field === `item-${index}-unitPrice`)}
                    />
                  </View>
                </View>
                
                <View style={[styles.rowFields, { marginTop: 16 }]}>
                  <View style={[styles.halfWidth, { marginRight: 8 }]}>
                    <View style={styles.discountRow}>
                      <AppTextField
                        label="Discount"
                        value={item.discount.toString()}
                        onChangeText={(value) => updateLineItem(item.id, 'discount', parseFloat(value) || 0)}
                        keyboardType="numeric"
                        placeholder="0"
                        error={errors.some(e => e.field === `item-${index}-discount`)}
                        containerStyle={{ flex: 1 }}
                      />
                      <TouchableOpacity 
                        style={[styles.discountTypeButton, { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor }]}
                        onPress={() => updateLineItem(item.id, 'discountType', item.discountType === 'percentage' ? 'fixed' : 'percentage')}
                      >
                        <Text style={{ color: appTheme.colors.text }}>{item.discountType === 'percentage' ? '%' : '$'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.halfWidth}>
                    <AppTextField
                      label="Tax Rate (%)"
                      value={item.taxRate.toString()}
                      onChangeText={(value) => updateLineItem(item.id, 'taxRate', parseFloat(value) || 0)}
                      keyboardType="numeric"
                      placeholder="0"
                      error={errors.some(e => e.field === `item-${index}-taxRate`)}
                    />
                  </View>
                </View>
                
                <View style={[styles.lineTotal, { borderTopColor: appTheme.colors.borderColor }]}>
                  <Text style={[styles.lineTotalLabel, { color: appTheme.colors.textLight }]}>Line Total:</Text>
                  <Text style={[styles.lineTotalValue, { color: appTheme.colors.text }]}>${item.total.toFixed(2)}</Text>
                </View>
              </View>
            ))}
            
            <TouchableOpacity 
              style={[styles.addItemButton, { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor }]}
              onPress={handleAddLineItem}
            >
              <Icon name="add-circle-outline" size={20} color={appTheme.colors.text} />
              <Text style={[styles.addItemButtonText, { color: appTheme.colors.text }]}>Add Another Item</Text>
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
            disabled={isSaving || isSending || errors.length > 0}
          />
        </View>

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
    padding: 10,
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lineItemContainer: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  lineItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.primary.bold,
  },
  lineTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  lineTotalLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.primary.medium,
  },
  lineTotalValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.primary.bold,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addItemButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.primary.medium,
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
});
