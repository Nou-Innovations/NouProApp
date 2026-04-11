/**
 * CreatePurchaseRequestScreen
 *
 * Form to create a new purchase request.
 * Items are manually entered (product name, qty, unit price).
 * Supports priority selection, optional supplier, required-by date, and notes.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import ProcurementStatusBadge from '../components/ProcurementStatusBadge';
import SupplierPickerModal from '../components/SupplierPickerModal';
import type { PurchaseRequestPriority, PurchaseRequestItem, Supplier } from '@/shared/types/procurement';
import * as procurementService from '../services/procurement.service';

// ── Local item type with temporary id for list keying ──
interface ItemRow {
  key: string;
  productName: string;
  quantity: string;
  unitPrice: string;
}

const PRIORITIES: PurchaseRequestPriority[] = ['LOW', 'NORMAL', 'URGENT'];

const PRIORITY_STYLES: Record<PurchaseRequestPriority, { bg: string; text: string }> = {
  LOW: { bg: '#F3F4F6', text: '#6B7280' },
  NORMAL: { bg: '#DBEAFE', text: '#0075FF' },
  URGENT: { bg: '#FEE2E2', text: '#FF2400' },
};

let keyCounter = 0;
const nextKey = () => String(++keyCounter);

export default function CreatePurchaseRequestScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id || '';

  // ── Form state ──
  const [supplierId, setSupplierId] = useState<string | null>(route.params?.supplierId ?? null);
  const [supplierName, setSupplierName] = useState<string>(route.params?.supplierName ?? '');
  const [items, setItems] = useState<ItemRow[]>([{ key: nextKey(), productName: '', quantity: '1', unitPrice: '' }]);
  const [priority, setPriority] = useState<PurchaseRequestPriority>('NORMAL');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Supplier picker state ──
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    if (businessId) {
      procurementService.getSuppliers(businessId).then(setSuppliers).catch(() => {});
    }
  }, [businessId]);

  const handleSupplierSelect = useCallback((supplier: Supplier) => {
    setSupplierId(supplier.id);
    setSupplierName(supplier.name);
    setShowSupplierPicker(false);
  }, []);

  // ── Computed total ──
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }, [items]);

  // ── Item management ──
  const addItemRow = useCallback(() => {
    setItems((prev) => [...prev, { key: nextKey(), productName: '', quantity: '1', unitPrice: '' }]);
  }, []);

  const removeItemRow = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const updateItem = useCallback((key: string, field: keyof ItemRow, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  }, []);

  // ── Build payload ──
  const buildPayload = useCallback(() => {
    const parsedItems: PurchaseRequestItem[] = items
      .filter((i) => i.productName.trim())
      .map((i) => ({
        productId: '',
        productName: i.productName.trim(),
        quantity: parseInt(i.quantity, 10) || 1,
        unitPrice: parseFloat(i.unitPrice) || 0,
        subtotal: (parseInt(i.quantity, 10) || 1) * (parseFloat(i.unitPrice) || 0),
      }));

    return {
      supplierId: supplierId || undefined,
      items: parsedItems,
      totalAmount,
      priority,
      requiredByDate: requiredByDate.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }, [items, supplierId, totalAmount, priority, requiredByDate, notes]);

  // ── Validate ──
  const validate = useCallback((): string | null => {
    const validItems = items.filter((i) => i.productName.trim());
    if (validItems.length === 0) return 'Please add at least one item with a product name.';
    return null;
  }, [items]);

  // ── Save as draft ──
  const handleSaveDraft = useCallback(async () => {
    const err = validate();
    if (err) { Alert.alert('Validation', err); return; }

    setIsSubmitting(true);
    try {
      await procurementService.createPurchaseRequest(businessId, buildPayload());
      Alert.alert('Success', 'Purchase request saved as draft.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create purchase request.');
    } finally {
      setIsSubmitting(false);
    }
  }, [businessId, buildPayload, validate, navigation]);

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { Alert.alert('Validation', err); return; }

    setIsSubmitting(true);
    try {
      const pr = await procurementService.createPurchaseRequest(businessId, buildPayload());
      await procurementService.submitPurchaseRequest(businessId, pr.id);
      Alert.alert('Success', 'Purchase request submitted for approval.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit purchase request.');
    } finally {
      setIsSubmitting(false);
    }
  }, [businessId, buildPayload, validate, navigation]);

  // ── Render ──
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="New Request"
        leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Supplier selector */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Supplier (optional)</Text>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground }]}
              onPress={() => setShowSupplierPicker(true)}
            >
              <Text style={[styles.selectorText, { color: supplierName ? appTheme.colors.text : appTheme.colors.textSecondary }]}>
                {supplierName || 'Select Supplier'}
              </Text>
              <Icon name="chevron-forward" size={20} color={appTheme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Items section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Items</Text>
              <TouchableOpacity onPress={addItemRow} style={[styles.addButton, { backgroundColor: appTheme.colors.primary }]}>
                <Icon name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View key={item.key} style={[styles.itemCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemIndex, { color: appTheme.colors.textSecondary }]}>Item {index + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItemRow(item.key)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Icon name="close-circle" size={22} color="#FF2400" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary }]}>Product Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground, color: appTheme.colors.text }]}
                  value={item.productName}
                  onChangeText={(v) => updateItem(item.key, 'productName', v)}
                  placeholder="Enter product name"
                  placeholderTextColor={appTheme.colors.textSecondary}
                />

                <View style={styles.itemRow}>
                  <View style={styles.itemRowField}>
                    <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary }]}>Quantity</Text>
                    <TextInput
                      style={[styles.input, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground, color: appTheme.colors.text }]}
                      value={item.quantity}
                      onChangeText={(v) => updateItem(item.key, 'quantity', v)}
                      placeholder="1"
                      placeholderTextColor={appTheme.colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.itemRowField}>
                    <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary }]}>Unit Price</Text>
                    <TextInput
                      style={[styles.input, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground, color: appTheme.colors.text }]}
                      value={item.unitPrice}
                      onChangeText={(v) => updateItem(item.key, 'unitPrice', v)}
                      placeholder="0.00"
                      placeholderTextColor={appTheme.colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {(parseFloat(item.quantity) > 0 && parseFloat(item.unitPrice) > 0) && (
                  <Text style={[styles.subtotalText, { color: appTheme.colors.primary }]}>
                    Subtotal: {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Priority selector */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => {
                const isSelected = priority === p;
                const pStyle = PRIORITY_STYLES[p];
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityPill,
                      { backgroundColor: isSelected ? pStyle.bg : 'transparent', borderColor: isSelected ? pStyle.text : appTheme.colors.borderColor },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.priorityText, { color: isSelected ? pStyle.text : appTheme.colors.textSecondary }]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Required by date */}
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary }]}>Required By Date</Text>
            <TextInput
              style={[styles.input, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground, color: appTheme.colors.text }]}
              value={requiredByDate}
              onChangeText={setRequiredByDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={appTheme.colors.textSecondary}
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground, color: appTheme.colors.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={appTheme.colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Total */}
          <View style={[styles.totalContainer, { borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.totalLabel, { color: appTheme.colors.textSecondary }]}>Total Amount</Text>
            <Text style={[styles.totalValue, { color: appTheme.colors.text }]}>{totalAmount.toFixed(2)}</Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom buttons */}
      <View style={[styles.bottomBar, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
        {isSubmitting && <ActivityIndicator style={styles.spinner} color={appTheme.colors.primary} />}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.draftButton, { borderColor: appTheme.colors.borderColor }]}
            onPress={handleSaveDraft}
            disabled={isSubmitting}
          >
            <Text style={[styles.draftButtonText, { color: appTheme.colors.text }]}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { opacity: isSubmitting ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
      <SupplierPickerModal
        visible={showSupplierPicker}
        onClose={() => setShowSupplierPicker(false)}
        onSelect={handleSupplierSelect}
        suppliers={suppliers}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },

  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6 },

  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  multilineInput: {
    height: 80,
    paddingTop: 12,
  },

  selectorButton: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: { fontSize: 16, flex: 1 },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  itemCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemIndex: { fontSize: 13, fontWeight: '600' },
  itemRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  itemRowField: { flex: 1 },
  subtotalText: { fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'right' },

  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityPill: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: { fontSize: 14, fontWeight: '600' },

  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 16, fontWeight: '500' },
  totalValue: { fontSize: 20, fontWeight: '700' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  bottomButtons: { flexDirection: 'row', gap: 12 },
  spinner: { marginBottom: 8 },

  draftButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftButtonText: { fontSize: 16, fontWeight: '600' },

  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
