/**
 * StockScreen - Location-level inventory management.
 *
 * Lists the business's products with their quantity on hand at the selected
 * location and lets an admin adjust it (backend `stockRepo.upsert`). Display
 * reuses `useProducts` (which already returns `stockQuantity` + `locationStocks`);
 * writes go through `setStock`.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Modal, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { ListItemCard, EmptyState } from '@/shared/components/ui';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';
import LocationDropdown from '@/shared/components/ui/LocationDropdown';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProducts } from '../hooks/useProducts';
import { setStock } from '../stock.service';
import type { UIProduct } from '@/shared/types/product';

export default function StockScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const currentLocation = useBusinessStore((s) => s.currentLocation);
  const selectedLocationId = currentLocation?.id || null;

  const { products, loading, refresh, updateProductLocal } = useProducts({
    locationId: selectedLocationId || undefined,
  });

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<UIProduct | null>(null);
  const [qtyInput, setQtyInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Quantity at the selected location (falls back to the summed stockQuantity).
  const qtyForProduct = (p: UIProduct): number => {
    const ls = (p as any).locationStocks as { locationId: string; qtyOnHand: number }[] | undefined;
    if (selectedLocationId && Array.isArray(ls)) {
      const match = ls.find((x) => x.locationId === selectedLocationId);
      if (match) return match.qtyOnHand ?? 0;
    }
    return p.stockQuantity ?? 0;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q),
    );
  }, [products, search]);

  const openEditor = (p: UIProduct) => {
    if (!selectedLocationId) {
      Alert.alert('Select a location', 'Choose a location above to adjust stock.');
      return;
    }
    setEditing(p);
    setQtyInput(String(qtyForProduct(p)));
  };

  const saveQty = async () => {
    if (!editing || !selectedLocationId) return;
    const qty = Number(qtyInput);
    if (Number.isNaN(qty) || qty < 0) {
      Alert.alert('Invalid quantity', 'Enter a number of 0 or more.');
      return;
    }
    setSaving(true);
    try {
      await setStock(selectedLocationId, editing.id, qty);
      updateProductLocal(editing.id, { stockQuantity: qty });
      setEditing(null);
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: UIProduct }) => {
    const qty = qtyForProduct(item);
    const out = qty <= 0;
    return (
      <ListItemCard
        avatar={{
          type: item.productPicture ? 'image' : 'icon',
          imageUri: item.productPicture,
          icon: 'cube-outline',
          userId: item.id,
          userName: item.name,
        }}
        title={item.name}
        subtitle={item.sku ? `SKU ${item.sku}` : item.brand || undefined}
        onPress={() => openEditor(item)}
        rightColumn={
          <View style={styles.qtyWrap}>
            <Text style={[styles.qty, { color: out ? appTheme.colors.error : appTheme.colors.text }]}>
              {qty}
            </Text>
            <Text style={[styles.qtyLabel, { color: appTheme.colors.textMuted }]}>in stock</Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Stock"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <View style={styles.locationRow}>
        <LocationDropdown style={{ flex: 1 }} />
      </View>
      <AppSearchBar
        placeholder="Search products"
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        containerStyle={styles.search}
      />
      {!selectedLocationId && (
        <Text style={[styles.hint, { color: appTheme.colors.textMuted }]}>
          Showing combined quantities. Pick a location to adjust stock.
        </Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          iconName="cube-outline"
          title="No products"
          subtitle="Add products to start tracking stock."
        />
      ) : (
        <FlatList data={filtered} keyExtractor={(p) => p.id} renderItem={renderItem} />
      )}

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={() => setEditing(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: appTheme.colors.cardBackground }]}>
            <Text style={[styles.sheetTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
              {editing?.name}
            </Text>
            <Text style={[styles.sheetSub, { color: appTheme.colors.textMuted }]} numberOfLines={1}>
              {currentLocation?.name || 'Selected location'}
            </Text>
            <AppTextField
              label="Quantity on hand"
              value={qtyInput}
              onChangeText={setQtyInput}
              keyboardType="number-pad"
              placeholder="0"
              containerStyle={styles.qtyField}
            />
            <AppButton
              title={saving ? 'Saving...' : 'Save'}
              onPress={saveQty}
              disabled={saving}
              style={styles.saveBtn}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  locationRow: { paddingHorizontal: 12, paddingTop: 4, flexDirection: 'row' },
  search: { marginHorizontal: 12, marginTop: 4, marginBottom: 4 },
  hint: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  qtyWrap: { alignItems: 'flex-end' },
  qty: { fontSize: 18, fontWeight: '700' },
  qtyLabel: { fontSize: 11, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 24 },
  sheet: { borderRadius: 16, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSub: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  qtyField: { marginBottom: 8 },
  saveBtn: { marginTop: 8 },
});
