/**
 * TransferCreateModal — request an internal stock transfer between two of the
 * business's own locations. Bottom-sheet modal mirroring ReportIssueModal.
 */
import React, { useState, useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import { CreateTransferData } from '@/shared/types/transfer';
import { createTransfer } from '../transfers.service';

interface TransferCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface DraftItem {
  name: string;
  quantity: string;
}

export function TransferCreateModal({ visible, onClose, onCreated }: TransferCreateModalProps) {
  const companyId = useProfileStore((s) => s.activeBusiness?.id) || '';
  const locations = useBusinessStore((s) => s.locations);

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>([{ name: '', quantity: '1' }]);
  const [submitting, setSubmitting] = useState(false);

  const fromLocation = useMemo(() => locations.find((l) => l.id === fromId), [locations, fromId]);
  const toLocation = useMemo(() => locations.find((l) => l.id === toId), [locations, toId]);

  const reset = () => {
    setFromId(null);
    setToId(null);
    setItems([{ name: '', quantity: '1' }]);
  };

  const close = () => { reset(); onClose(); };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { name: '', quantity: '1' }]);
  const removeItem = (index: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const submit = async () => {
    if (!fromId || !toId) {
      Alert.alert('Missing locations', 'Pick both a source and a destination location.');
      return;
    }
    if (fromId === toId) {
      Alert.alert('Same location', 'Source and destination must be different.');
      return;
    }
    const cleanItems = items
      .map((it) => ({ name: it.name.trim(), quantity: parseInt(it.quantity, 10) || 0 }))
      .filter((it) => it.name.length > 0 && it.quantity > 0);
    if (cleanItems.length === 0) {
      Alert.alert('No items', 'Add at least one item with a name and quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateTransferData = {
        fromLocationId: fromId,
        toLocationId: toId,
        fromLocationName: fromLocation?.name,
        toLocationName: toLocation?.name,
        items: cleanItems.map((it) => ({ productId: it.name, name: it.name, quantity: it.quantity })),
      };
      await createTransfer(companyId, payload);
      reset();
      onCreated?.();
      onClose();
    } catch {
      Alert.alert('Could not create transfer', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderLocationChips = (selectedId: string | null, onSelect: (id: string) => void, disabledId: string | null) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {locations.length === 0 ? (
        <Text style={styles.emptyHint}>No locations available</Text>
      ) : (
        locations.map((loc) => {
          const active = selectedId === loc.id;
          const disabled = disabledId === loc.id;
          return (
            <TouchableOpacity
              key={loc.id}
              onPress={() => onSelect(loc.id)}
              disabled={disabled}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.colors.accent : theme.colors.inputBackground,
                  borderColor: active ? theme.colors.accent : theme.colors.borderColor,
                  opacity: disabled ? 0.4 : 1,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : theme.colors.textSecondary }]} numberOfLines={1}>
                {loc.name}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.header}>
            <Text style={styles.title}>New transfer</Text>
            <TouchableOpacity onPress={close}><Icon name="close" size={24} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>From</Text>
            {renderLocationChips(fromId, setFromId, toId)}

            <View style={styles.swapRow}>
              <Icon name="swap-horizontal-outline" size={20} color={theme.colors.textSecondary} />
            </View>

            <Text style={styles.label}>To</Text>
            {renderLocationChips(toId, setToId, fromId)}

            <Text style={styles.label}>Items</Text>
            {items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <TextInput
                  value={item.name}
                  onChangeText={(t) => updateItem(index, { name: t })}
                  placeholder="Product name"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, styles.itemName]}
                />
                <TextInput
                  value={item.quantity}
                  onChangeText={(t) => updateItem(index, { quantity: t.replace(/[^0-9]/g, '') })}
                  placeholder="Qty"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, styles.itemQty]}
                />
                <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn} disabled={items.length === 1}>
                  <Icon name="close" size={18} color={items.length === 1 ? theme.colors.textMuted : theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={[styles.addItemBtn, { borderColor: theme.colors.borderColor }]} onPress={addItem}>
              <Icon name="add" size={18} color={theme.colors.accent} />
              <Text style={[styles.addItemText, { color: theme.colors.accent }]}>Add item</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.submit, { backgroundColor: theme.colors.accent }]} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Request transfer</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontFamily: 'InterCustom-SemiBold', color: theme.colors.text },
  label: { fontSize: 14, fontFamily: 'InterCustom-SemiBold', color: theme.colors.textSecondary, marginTop: 14, marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, maxWidth: 180 },
  chipText: { fontSize: 13, fontFamily: 'InterCustom-Medium' },
  emptyHint: { fontSize: 13, fontFamily: 'InterCustom-Regular', color: theme.colors.textMuted, paddingVertical: 8 },
  swapRow: { alignItems: 'center', marginTop: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: theme.colors.borderColor, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 15, color: theme.colors.text },
  itemName: { flex: 1 },
  itemQty: { width: 64, textAlign: 'center' },
  removeBtn: { padding: 4 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', marginTop: 4 },
  addItemText: { fontSize: 14, fontFamily: 'InterCustom-SemiBold' },
  submit: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'InterCustom-SemiBold' },
});

export default TransferCreateModal;
