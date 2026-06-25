/**
 * GoodsReceiptScreen
 *
 * Receiving form for a purchase order. Shows ordered items
 * and allows entering received qty, damaged qty, and notes per item.
 * Submits a goods receipt via the useGoodsReceipt hook.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import { AppButton } from '@/shared/components/ui';
import ProcurementStatusBadge from '../components/ProcurementStatusBadge';
import type { PurchaseOrder, GoodsReceiptItem, CreateGoodsReceiptData } from '@/shared/types/procurement';
import * as procurementService from '../services/procurement.service';
import { useGoodsReceipt } from '../hooks/useGoodsReceipt';

// ── Local row state ──
interface ReceiptItemRow {
  productId: string;
  productName: string;
  orderedQty: number;
  receivedQty: string;
  damagedQty: string;
  notes: string;
}

export default function GoodsReceiptScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id || '';
  const purchaseOrderId: string = route.params?.purchaseOrderId ?? '';

  const { submitReceipt, isSubmitting } = useGoodsReceipt();

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemRows, setItemRows] = useState<ReceiptItemRow[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');

  // ── Fetch PO to pre-fill items ──
  const fetchPO = useCallback(async () => {
    if (!businessId || !purchaseOrderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await procurementService.getPurchaseOrder(businessId, purchaseOrderId);
      setPo(data);
      setItemRows(
        data.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          orderedQty: item.quantity,
          receivedQty: String(item.quantity),
          damagedQty: '0',
          notes: '',
        }))
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to load purchase order.');
    } finally {
      setLoading(false);
    }
  }, [businessId, purchaseOrderId]);

  useEffect(() => {
    fetchPO();
  }, [fetchPO]);

  // ── Update item row ──
  const updateRow = useCallback((index: number, field: keyof ReceiptItemRow, value: string) => {
    setItemRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }, []);

  // ── Submit receipt ──
  const handleSubmit = useCallback(async () => {
    const parsedItems: GoodsReceiptItem[] = itemRows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      orderedQty: row.orderedQty,
      receivedQty: parseInt(row.receivedQty, 10) || 0,
      damagedQty: parseInt(row.damagedQty, 10) || 0,
      notes: row.notes.trim() || undefined,
    }));

    // Validation
    const hasInvalid = parsedItems.some((item) => item.receivedQty < 0);
    if (hasInvalid) {
      AppAlert.alert('Validation', 'Received quantities cannot be negative.');
      return;
    }

    const payload: CreateGoodsReceiptData = {
      items: parsedItems,
      notes: generalNotes.trim() || undefined,
    };

    const grn = await submitReceipt(purchaseOrderId, payload);

    if (grn) {
      AppAlert.alert('Success', `Goods receipt ${grn.id} created successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [itemRows, generalNotes, purchaseOrderId, submitReceipt, navigation]);

  // ── Loading / Error ──
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Receive Goods" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack() }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !po) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Receive Goods" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack() }} />
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: appTheme.colors.textSecondary }]}>{error || 'Purchase order not found.'}</Text>
          <AppButton title="Retry" onPress={fetchPO} variant="outline" size="small" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Receive Goods"
        leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }}
      />

      <KeyboardAwareScreen style={styles.scroll}>
          {/* PO reference */}
          <View style={[styles.refCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.refLabel, { color: appTheme.colors.textSecondary }]}>Purchase Order</Text>
            <Text style={[styles.refValue, { color: appTheme.colors.text }]}>{po.poNumber || po.id.slice(0, 12)}</Text>
            <Text style={[styles.refSupplier, { color: appTheme.colors.textSecondary }]}>{po.supplier?.name || 'Unknown Supplier'}</Text>
          </View>

          {/* Items */}
          {itemRows.map((row, index) => (
            <View key={index} style={[styles.itemCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
              <Text style={[styles.itemName, { color: appTheme.colors.text }]}>{row.productName}</Text>
              <Text style={[styles.orderedLabel, { color: appTheme.colors.textSecondary }]}>
                Ordered: {row.orderedQty}
              </Text>

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary }]}>Received Qty</Text>
                  <TextInput
                    style={[styles.input, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground, color: appTheme.colors.text }]}
                    value={row.receivedQty}
                    onChangeText={(v) => updateRow(index, 'receivedQty', v)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={appTheme.colors.textSecondary}
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary }]}>Damaged Qty</Text>
                  <TextInput
                    style={[styles.input, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground, color: appTheme.colors.text }]}
                    value={row.damagedQty}
                    onChangeText={(v) => updateRow(index, 'damagedQty', v)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={appTheme.colors.textSecondary}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary, marginTop: 8 }]}>Item Notes</Text>
              <TextInput
                style={[styles.input, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground, color: appTheme.colors.text }]}
                value={row.notes}
                onChangeText={(v) => updateRow(index, 'notes', v)}
                placeholder="Optional notes for this item"
                placeholderTextColor={appTheme.colors.textSecondary}
              />
            </View>
          ))}

          {/* General notes */}
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: appTheme.colors.textSecondary }]}>General Notes</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, { borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.cardBackground, color: appTheme.colors.text }]}
              value={generalNotes}
              onChangeText={setGeneralNotes}
              placeholder="Add general notes..."
              placeholderTextColor={appTheme.colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 120 }} />
      </KeyboardAwareScreen>

      {/* Submit button */}
      <View style={[styles.bottomBar, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
        <AppButton
          title="Submit Receipt"
          onPress={handleSubmit}
          variant="confirm"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },

  refCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  refLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  refValue: { fontSize: 18, fontWeight: '700' },
  refSupplier: { fontSize: 14, marginTop: 4 },

  itemCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  itemName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  orderedLabel: { fontSize: 13, marginBottom: 10 },

  inputRow: { flexDirection: 'row', gap: 12 },
  inputCol: { flex: 1 },

  section: { marginBottom: 20 },
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

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
});
