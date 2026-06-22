/**
 * ReturnCreateModal — create a return (RMA).
 * Minimal v1 editor: customer name, reason, and free-text product lines
 * with quantity, condition (resellable/damaged) and disposition (restock/writeoff).
 */
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Icon } from '@/shared/utils/icons';
import { AppButton, TextButton } from '@/shared/components/ui';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { ReturnItem } from '@/shared/types/return';
import { createReturn } from '../returns.service';

interface ReturnCreateModalProps {
  visible: boolean;
  onClose: () => void;
  orderId?: string;
  onCreated?: () => void;
}

type DraftItem = {
  name: string;
  quantity: string;
  condition: 'resellable' | 'damaged';
  disposition: 'restock' | 'writeoff';
};

const emptyDraft = (): DraftItem => ({ name: '', quantity: '1', condition: 'resellable', disposition: 'restock' });

export function ReturnCreateModal({ visible, onClose, orderId, onCreated }: ReturnCreateModalProps) {
  const companyId = useProfileStore((s) => s.activeBusiness?.id) || '';
  const [customerName, setCustomerName] = useState('');
  const [reason, setReason] = useState('');
  const [draft, setDraft] = useState<DraftItem>(emptyDraft());
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setCustomerName(''); setReason(''); setDraft(emptyDraft()); setItems([]); };

  const addItem = () => {
    const name = draft.name.trim();
    const quantity = Math.max(1, parseInt(draft.quantity, 10) || 1);
    if (!name) return;
    setItems((prev) => [...prev, { productId: `freeform-${Date.now()}`, name, quantity, condition: draft.condition, disposition: draft.disposition }]);
    setDraft(emptyDraft());
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (items.length === 0) {
      Alert.alert('Add at least one item', 'A return needs one or more items.');
      return;
    }
    setSubmitting(true);
    try {
      await createReturn(companyId, {
        orderId: orderId || null,
        customerName: customerName.trim() || null,
        reason: reason.trim() || null,
        items,
      });
      reset();
      onCreated?.();
      onClose();
    } catch {
      Alert.alert('Could not create return', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.header}>
            <Text style={styles.title}>New return</Text>
            <TouchableOpacity onPress={onClose}><Icon name="close" size={24} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Customer</Text>
            <TextInput value={customerName} onChangeText={setCustomerName} placeholder="Customer name" placeholderTextColor={theme.colors.textMuted} style={styles.input} />

            <Text style={styles.label}>Reason</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="Why is it being returned…" placeholderTextColor={theme.colors.textMuted} multiline style={[styles.input, styles.multiline]} />

            <Text style={styles.label}>Items</Text>
            {items.map((it, idx) => (
              <View key={`${it.productId}-${idx}`} style={[styles.itemChip, { borderColor: theme.colors.borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}  ×{it.quantity}</Text>
                  <Text style={styles.itemMeta}>{it.condition} · {it.disposition}</Text>
                </View>
                <TouchableOpacity onPress={() => removeItem(idx)}><Icon name="close" size={18} color={theme.colors.textSecondary} /></TouchableOpacity>
              </View>
            ))}

            <View style={[styles.addBox, { borderColor: theme.colors.borderColor }]}>
              <View style={styles.addRow}>
                <TextInput value={draft.name} onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))} placeholder="Product" placeholderTextColor={theme.colors.textMuted} style={[styles.input, { flex: 1, marginBottom: 0 }]} />
                <TextInput value={draft.quantity} onChangeText={(t) => setDraft((d) => ({ ...d, quantity: t.replace(/[^0-9]/g, '') }))} placeholder="Qty" placeholderTextColor={theme.colors.textMuted} keyboardType="number-pad" style={[styles.input, styles.qty, { marginBottom: 0 }]} />
              </View>

              <View style={styles.toggleRow}>
                {(['resellable', 'damaged'] as const).map((c) => {
                  const active = draft.condition === c;
                  return (
                    <TouchableOpacity key={c} onPress={() => setDraft((d) => ({ ...d, condition: c }))} style={[styles.toggle, { backgroundColor: active ? theme.colors.accent : theme.colors.inputBackground, borderColor: active ? theme.colors.accent : theme.colors.borderColor }]}>
                      <Text style={[styles.toggleText, { color: active ? '#FFFFFF' : theme.colors.textSecondary }]}>{c === 'resellable' ? 'Resellable' : 'Damaged'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.toggleRow}>
                {(['restock', 'writeoff'] as const).map((d2) => {
                  const active = draft.disposition === d2;
                  return (
                    <TouchableOpacity key={d2} onPress={() => setDraft((d) => ({ ...d, disposition: d2 }))} style={[styles.toggle, { backgroundColor: active ? theme.colors.accent : theme.colors.inputBackground, borderColor: active ? theme.colors.accent : theme.colors.borderColor }]}>
                      <Text style={[styles.toggleText, { color: active ? '#FFFFFF' : theme.colors.textSecondary }]}>{d2 === 'restock' ? 'Restock' : 'Write off'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextButton title="Add item" onPress={addItem} iconLeft={Plus} style={styles.addBtn} />
            </View>
          </ScrollView>

          <AppButton
            title="Create return"
            onPress={submit}
            variant="accent"
            loading={submitting}
            disabled={submitting}
            fullWidth
            style={styles.submit}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontFamily: 'InterCustom-SemiBold', color: theme.colors.text },
  label: { fontSize: 14, fontFamily: 'InterCustom-SemiBold', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: theme.colors.borderColor, borderRadius: 10, padding: 10, fontSize: 15, color: theme.colors.text, marginBottom: 4 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  qty: { width: 70, textAlign: 'center' },
  itemChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  itemName: { fontSize: 15, fontFamily: 'InterCustom-Medium', color: theme.colors.text },
  itemMeta: { fontSize: 13, fontFamily: 'InterCustom-Regular', color: theme.colors.textSecondary, marginTop: 2 },
  addBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 12, marginTop: 4 },
  addRow: { flexDirection: 'row', gap: 8 },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  toggle: { flex: 1, paddingVertical: 9, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  toggleText: { fontSize: 13, fontFamily: 'InterCustom-Medium' },
  addBtn: { alignSelf: 'center', marginTop: 12 },
  submit: { marginTop: 16 },
});

export default ReturnCreateModal;
