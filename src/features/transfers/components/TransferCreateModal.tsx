/**
 * TransferCreateModal — request an internal stock transfer between two of the
 * business's own locations. Bottom-sheet modal mirroring ReportIssueModal.
 *
 * Items are picked from the real product catalog (the backend rejects unknown
 * productIds) with on-hand stock at the source location shown as a hint. The
 * picker is rendered INSIDE this Modal (mode swap, not a nested sheet): the
 * root-mounted AppBottomSheet/AppAlert host would render behind an open RN
 * Modal on iOS.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList, ActivityIndicator, Image } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { Plus } from 'lucide-react-native';
import { Icon } from '@/shared/utils/icons';
import { AppButton, TextButton } from '@/shared/components/ui';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import { CreateTransferData } from '@/shared/types/transfer';
import { UIProduct } from '@/shared/types/product';
import { getProducts } from '@/features/products/products.service';
import { createTransfer } from '../transfers.service';

interface TransferCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface DraftItem {
  productId: string;
  name: string;
  price?: number;
  image?: string;
  quantity: string;
}

export function TransferCreateModal({ visible, onClose, onCreated }: TransferCreateModalProps) {
  const companyId = useProfileStore((s) => s.activeBusiness?.id) || '';
  const locations = useBusinessStore((s) => s.locations);

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'form' | 'picker'>('form');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<UIProduct[] | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fromLocation = useMemo(() => locations.find((l) => l.id === fromId), [locations, fromId]);
  const toLocation = useMemo(() => locations.find((l) => l.id === toId), [locations, toId]);

  // Catalog + per-product on-hand at the source location. Re-fetched when the
  // From location changes so item stock hints stay accurate for the new source.
  useEffect(() => {
    if (!visible || !companyId || !fromId) {
      setProducts(null);
      return;
    }
    let stale = false;
    setLoadingProducts(true);
    getProducts({ companyId, locationId: fromId })
      .then((list) => { if (!stale) setProducts(list); })
      .catch(() => { if (!stale) setProducts([]); })
      .finally(() => { if (!stale) setLoadingProducts(false); });
    return () => { stale = true; };
  }, [visible, companyId, fromId]);

  const stockById = useMemo(() => {
    if (!products) return null;
    return new Map(products.map((p) => [p.id, p.stockQuantity ?? 0]));
  }, [products]);

  const reset = () => {
    setFromId(null);
    setToId(null);
    setItems([]);
    setMode('form');
    setSearch('');
    setProducts(null);
  };

  const close = () => { reset(); onClose(); };

  const updateItemQty = (productId: string, quantity: string) => {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, quantity } : it)));
  };
  const removeItem = (productId: string) => setItems((prev) => prev.filter((it) => it.productId !== productId));

  const addProduct = (p: UIProduct) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.productId === p.id);
      if (existing) {
        const next = (parseInt(existing.quantity, 10) || 0) + 1;
        return prev.map((it) => (it.productId === p.id ? { ...it, quantity: String(next) } : it));
      }
      return [...prev, {
        productId: p.id,
        name: p.name,
        ...(p.price != null ? { price: p.price } : {}),
        ...(p.productPicture ? { image: p.productPicture } : {}),
        quantity: '1',
      }];
    });
  };

  const submit = async () => {
    if (!fromId || !toId) {
      AppAlert.alert('Missing locations', 'Pick both a source and a destination location.');
      return;
    }
    if (fromId === toId) {
      AppAlert.alert('Same location', 'Source and destination must be different.');
      return;
    }
    const cleanItems = items
      .map((it) => ({ ...it, quantity: parseInt(it.quantity, 10) || 0 }))
      .filter((it) => it.quantity > 0);
    if (cleanItems.length === 0) {
      AppAlert.alert('No items', 'Add at least one product with a quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateTransferData = {
        fromLocationId: fromId,
        toLocationId: toId,
        fromLocationName: fromLocation?.name,
        toLocationName: toLocation?.name,
        items: cleanItems.map((it) => ({
          productId: it.productId,
          name: it.name,
          ...(it.price != null ? { price: it.price } : {}),
          ...(it.image ? { image: it.image } : {}),
          quantity: it.quantity,
        })),
      };
      await createTransfer(companyId, payload);
      reset();
      onCreated?.();
      onClose();
    } catch {
      AppAlert.alert('Could not create transfer', 'Please try again.');
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

  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const stockHint = (productId: string): string | null => {
    if (!stockById) return null;
    const qty = stockById.get(productId);
    if (qty == null) return `Not stocked at ${fromLocation?.name || 'source'}`;
    return `${qty} in stock at ${fromLocation?.name || 'source'}`;
  };

  const renderPickerRow = ({ item: p }: { item: UIProduct }) => {
    const inCart = items.find((it) => it.productId === p.id);
    return (
      <TouchableOpacity style={styles.pickerRow} onPress={() => addProduct(p)}>
        {p.productPicture ? (
          <Image source={{ uri: p.productPicture }} style={styles.pickerImage} />
        ) : (
          <View style={[styles.pickerImage, styles.pickerImagePlaceholder]}>
            <Icon name="cube-outline" size={18} color={theme.colors.textMuted} />
          </View>
        )}
        <View style={styles.pickerInfo}>
          <Text style={styles.pickerName} numberOfLines={1}>{p.name}</Text>
          <Text style={styles.pickerMeta} numberOfLines={1}>
            {(p.stockQuantity ?? 0)} in stock{p.price != null ? ` · ${p.price}` : ''}
          </Text>
        </View>
        {inCart ? (
          <View style={styles.qtyBadge}><Text style={styles.qtyBadgeText}>×{inCart.quantity || '0'}</Text></View>
        ) : (
          <Icon name="add-circle-outline" size={24} color={theme.colors.accent} />
        )}
      </TouchableOpacity>
    );
  };

  const renderPicker = () => (
    <View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search products"
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, styles.searchInput]}
        autoCorrect={false}
      />
      <View style={styles.pickerList}>
        {loadingProducts ? (
          <View style={styles.pickerEmpty}><ActivityIndicator color={theme.colors.accent} /></View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.pickerEmpty}>
            <Text style={styles.emptyHint}>
              {(products ?? []).length === 0 ? 'No products found for this business.' : 'No products match your search.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(p) => p.id}
            renderItem={renderPickerRow}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
      <AppButton
        title={items.length > 0 ? `Done (${items.length} item${items.length === 1 ? '' : 's'})` : 'Done'}
        onPress={() => { setSearch(''); setMode('form'); }}
        variant="accent"
        fullWidth
        style={styles.submit}
      />
    </View>
  );

  const renderForm = () => (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>From</Text>
      {renderLocationChips(fromId, setFromId, toId)}

      <View style={styles.swapRow}>
        <Icon name="swap-horizontal-outline" size={20} color={theme.colors.textSecondary} />
      </View>

      <Text style={styles.label}>To</Text>
      {renderLocationChips(toId, setToId, fromId)}

      <Text style={styles.label}>Items</Text>
      {items.map((item) => {
        const hint = stockHint(item.productId);
        const stock = stockById?.get(item.productId);
        const qty = parseInt(item.quantity, 10) || 0;
        const over = stock != null && qty > stock;
        return (
          <View key={item.productId} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              {hint ? (
                <Text style={[styles.itemHint, over && { color: theme.colors.warning || '#E8A13A' }]} numberOfLines={1}>
                  {over ? `Only ${stock} in stock at ${fromLocation?.name || 'source'}` : hint}
                </Text>
              ) : null}
            </View>
            <TextInput
              value={item.quantity}
              onChangeText={(t) => updateItemQty(item.productId, t.replace(/[^0-9]/g, ''))}
              placeholder="Qty"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="number-pad"
              style={[styles.input, styles.itemQty]}
            />
            <TouchableOpacity onPress={() => removeItem(item.productId)} style={styles.removeBtn}>
              <Icon name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        );
      })}

      {fromId ? (
        <TextButton title="Add item" onPress={() => setMode('picker')} iconLeft={Plus} style={styles.addItemBtn} />
      ) : (
        <Text style={styles.emptyHint}>Pick a From location to add items.</Text>
      )}

      <AppButton
        title="Request transfer"
        onPress={submit}
        variant="accent"
        loading={submitting}
        disabled={submitting}
        fullWidth
        style={styles.submit}
      />
    </ScrollView>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={mode === 'picker' ? () => setMode('form') : close}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.header}>
            {mode === 'picker' ? (
              <View style={styles.pickerHeaderLeft}>
                <TouchableOpacity onPress={() => { setSearch(''); setMode('form'); }} style={styles.backBtn}>
                  <Icon name="chevron-back" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.title}>Add items</Text>
              </View>
            ) : (
              <Text style={styles.title}>New transfer</Text>
            )}
            <TouchableOpacity onPress={close}><Icon name="close" size={24} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>

          {mode === 'picker' ? renderPicker() : renderForm()}
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
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontFamily: 'InterCustom-Medium', color: theme.colors.text },
  itemHint: { fontSize: 12, fontFamily: 'InterCustom-Regular', color: theme.colors.textMuted, marginTop: 2 },
  input: { borderWidth: 1, borderColor: theme.colors.borderColor, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 15, color: theme.colors.text },
  itemQty: { width: 64, textAlign: 'center' },
  removeBtn: { padding: 4 },
  addItemBtn: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.borderColor, marginTop: 4 },
  submit: { marginTop: 20 },
  // Picker mode
  pickerHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { padding: 2, marginLeft: -6 },
  searchInput: { marginTop: 12 },
  pickerList: { height: 420, marginTop: 12 },
  pickerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.borderColor },
  pickerImage: { width: 40, height: 40, borderRadius: 8, backgroundColor: theme.colors.inputBackground },
  pickerImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: 15, fontFamily: 'InterCustom-Medium', color: theme.colors.text },
  pickerMeta: { fontSize: 12, fontFamily: 'InterCustom-Regular', color: theme.colors.textMuted, marginTop: 2 },
  qtyBadge: { backgroundColor: theme.colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  qtyBadgeText: { fontSize: 12, fontFamily: 'InterCustom-SemiBold', color: '#FFFFFF' },
});

export default TransferCreateModal;
