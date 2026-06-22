/**
 * TransferReceiveModal — confirm received quantities per item when receiving a
 * transfer. Shortfalls/damage are turned into Issues by the backend.
 */
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { QrCode } from 'lucide-react-native';
import { Icon } from '@/shared/utils/icons';
import { AppButton, TextButton } from '@/shared/components/ui';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import ScannerModal from '@/shared/components/ui/ScannerModal';
import { Transfer } from '@/shared/types/transfer';
import { receiveTransfer, ReceiveTransferItem } from '../transfers.service';

interface TransferReceiveModalProps {
  visible: boolean;
  onClose: () => void;
  transfer: Transfer | null;
  onReceived?: (updated: Transfer) => void;
}

export function TransferReceiveModal({ visible, onClose, transfer, onReceived }: TransferReceiveModalProps) {
  const companyId = useProfileStore((s) => s.activeBusiness?.id) || '';
  const [rows, setRows] = useState<Record<string, { received: string; damaged: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Match a scanned code to an item (by productId, then name) and mark it fully received.
  const handleScanned = (code: string) => {
    setScanning(false);
    const value = code.trim().toLowerCase();
    const match = (transfer?.items || []).find(
      (it) => it.productId.toLowerCase() === value || (it.name || '').toLowerCase() === value
    );
    if (match) {
      setRows((prev) => ({ ...prev, [match.productId]: { received: String(match.quantity ?? 0), damaged: prev[match.productId]?.damaged ?? '0' } }));
    } else {
      Alert.alert('Not found', 'That code does not match an item on this transfer.');
    }
  };

  useEffect(() => {
    if (visible && transfer) {
      const init: Record<string, { received: string; damaged: string }> = {};
      (transfer.items || []).forEach((it) => {
        init[it.productId] = { received: String(it.quantity ?? 0), damaged: '0' };
      });
      setRows(init);
    }
  }, [visible, transfer]);

  const setField = (productId: string, field: 'received' | 'damaged', value: string) => {
    setRows((prev) => ({ ...prev, [productId]: { ...prev[productId], [field]: value.replace(/[^0-9]/g, '') } }));
  };

  const submit = async () => {
    if (!transfer) return;
    setSubmitting(true);
    try {
      const items: ReceiveTransferItem[] = (transfer.items || []).map((it) => ({
        productId: it.productId,
        quantityReceived: Number(rows[it.productId]?.received || 0),
        quantityDamaged: Number(rows[it.productId]?.damaged || 0),
      }));
      const updated = await receiveTransfer(companyId, transfer.id, items);
      onReceived?.(updated);
      onClose();
    } catch {
      Alert.alert('Could not receive', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Receive transfer</Text>
            <TouchableOpacity onPress={onClose}><Icon name="close" size={24} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 380 }}>
            <View style={styles.rowHead}>
              <Text style={[styles.colItem, styles.headText]}>Item</Text>
              <Text style={[styles.colQty, styles.headText]}>Shipped</Text>
              <Text style={[styles.colQty, styles.headText]}>Received</Text>
              <Text style={[styles.colQty, styles.headText]}>Damaged</Text>
            </View>
            {(transfer?.items || []).map((it) => (
              <View key={it.productId} style={styles.row}>
                <Text style={[styles.colItem, styles.itemName]} numberOfLines={1}>{it.name}</Text>
                <Text style={[styles.colQty, styles.shipped]}>{it.quantity ?? 0}</Text>
                <TextInput
                  value={rows[it.productId]?.received ?? ''}
                  onChangeText={(v) => setField(it.productId, 'received', v)}
                  keyboardType="number-pad"
                  style={[styles.colQty, styles.input, { color: theme.colors.text, borderColor: theme.colors.borderColor }]}
                />
                <TextInput
                  value={rows[it.productId]?.damaged ?? ''}
                  onChangeText={(v) => setField(it.productId, 'damaged', v)}
                  keyboardType="number-pad"
                  style={[styles.colQty, styles.input, { color: theme.colors.text, borderColor: theme.colors.borderColor }]}
                />
              </View>
            ))}
          </ScrollView>

          <TextButton
            title="Scan to receive"
            onPress={() => setScanning(true)}
            iconLeft={QrCode}
            style={styles.scanBtn}
          />

          <AppButton
            title="Confirm received"
            onPress={submit}
            variant="confirm"
            loading={submitting}
            disabled={submitting}
            fullWidth
            style={styles.submit}
          />
        </View>
      </View>

      <ScannerModal
        visible={scanning}
        onClose={() => setScanning(false)}
        onScanned={handleScanned}
        title="Scan item barcode"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontFamily: 'InterCustom-SemiBold', color: theme.colors.text },
  rowHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  headText: { fontSize: 12, fontFamily: 'InterCustom-SemiBold', color: theme.colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  colItem: { flex: 1, paddingRight: 8 },
  colQty: { width: 64, textAlign: 'center' },
  itemName: { fontSize: 14, fontFamily: 'InterCustom-Medium', color: theme.colors.text },
  shipped: { fontSize: 14, fontFamily: 'InterCustom-Medium', color: theme.colors.textSecondary },
  input: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, fontSize: 14 },
  scanBtn: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.borderColor, marginTop: 16 },
  submit: { marginTop: 12 },
});

export default TransferReceiveModal;
