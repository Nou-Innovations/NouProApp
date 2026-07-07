/**
 * SupplierProductsScreen
 *
 * Shows the list of products linked to a specific supplier.
 * Displays product name, supplier price, min order qty, and bulk pricing.
 * "+" action in the header opens a bottom sheet to link a catalog product
 * to this supplier with supplier-specific pricing.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import {
  EmptyState,
  AppBottomSheet,
  AppBottomSheetScrollView,
  AppSearchBar,
  AppTextField,
  AppButton,
} from '@/shared/components/ui';
import { Icon } from '@/shared/utils/icons';
import type { SupplierProduct } from '@/shared/types/procurement';
import type { UIProduct } from '@/shared/types/product';
import { getProducts } from '@/features/products/products.service';
import * as procurementService from '../services/procurement.service';

export default function SupplierProductsScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id || '';

  const supplierId: string = route.params?.supplierId ?? '';
  const supplierName: string = route.params?.supplierName ?? 'Supplier';

  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Add-product sheet state ──
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [catalog, setCatalog] = useState<UIProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<UIProduct | null>(null);
  const [supplierPrice, setSupplierPrice] = useState('');
  const [minOrderQty, setMinOrderQty] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkMinQty, setBulkMinQty] = useState('');
  const [supplierSKU, setSupplierSKU] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Fetch ──
  const fetchProducts = useCallback(async () => {
    if (!businessId || !supplierId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await procurementService.getSupplierProducts(businessId, supplierId);
      setProducts(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load supplier products.');
    } finally {
      setLoading(false);
    }
  }, [businessId, supplierId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = useCallback(async () => {
    if (!businessId || !supplierId) return;
    setRefreshing(true);
    try {
      const data = await procurementService.getSupplierProducts(businessId, supplierId);
      setProducts(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load supplier products.');
    } finally {
      setRefreshing(false);
    }
  }, [businessId, supplierId]);

  // ── Add product ──
  const resetAddForm = useCallback(() => {
    setSelectedProduct(null);
    setSearch('');
    setSupplierPrice('');
    setMinOrderQty('');
    setBulkPrice('');
    setBulkMinQty('');
    setSupplierSKU('');
    setLeadTimeDays('');
  }, []);

  const handleAddProduct = useCallback(async () => {
    if (!businessId) return;
    resetAddForm();
    setShowAddSheet(true);
    setCatalogLoading(true);
    try {
      const data = await getProducts({ companyId: businessId });
      setCatalog(data);
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to load products.');
    } finally {
      setCatalogLoading(false);
    }
  }, [businessId, resetAddForm]);

  const handleCloseAddSheet = useCallback(() => {
    setShowAddSheet(false);
    resetAddForm();
  }, [resetAddForm]);

  // Products not already linked to this supplier, filtered by the search box.
  const availableProducts = useMemo(() => {
    const linkedIds = new Set(products.map((p) => p.productId));
    const q = search.trim().toLowerCase();
    return catalog.filter(
      (p) => !linkedIds.has(p.id) && (!q || p.name.toLowerCase().includes(q))
    );
  }, [catalog, products, search]);

  const handleSaveSupplierProduct = useCallback(async () => {
    if (!businessId || !supplierId) return;
    if (!selectedProduct) {
      AppAlert.alert('Select a product', 'Please choose a product to add.');
      return;
    }
    const price = parseFloat(supplierPrice);
    if (!supplierPrice.trim() || isNaN(price) || price < 0) {
      AppAlert.alert('Invalid price', 'Please enter a valid supplier price.');
      return;
    }
    const toNum = (s: string) => {
      const n = parseFloat(s);
      return s.trim() && !isNaN(n) ? n : undefined;
    };
    setSaving(true);
    try {
      await procurementService.addSupplierProduct(businessId, supplierId, {
        productId: selectedProduct.id,
        supplierPrice: price,
        minOrderQty: toNum(minOrderQty),
        bulkPrice: toNum(bulkPrice),
        bulkMinQty: toNum(bulkMinQty),
        supplierSKU: supplierSKU.trim() || undefined,
        leadTimeDays: toNum(leadTimeDays),
      });
      handleCloseAddSheet();
      await fetchProducts();
      AppAlert.alert('Added', 'Product linked to this supplier.');
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to add supplier product.');
    } finally {
      setSaving(false);
    }
  }, [
    businessId,
    supplierId,
    selectedProduct,
    supplierPrice,
    minOrderQty,
    bulkPrice,
    bulkMinQty,
    supplierSKU,
    leadTimeDays,
    handleCloseAddSheet,
    fetchProducts,
  ]);

  // ── Render product card ──
  const renderItem = useCallback(
    ({ item }: { item: SupplierProduct }) => (
      <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
        <Text style={[styles.productName, { color: appTheme.colors.text }]}>
          {item.product?.name || 'Unknown Product'}
        </Text>
        {item.supplierSKU && (
          <Text style={[styles.sku, { color: appTheme.colors.textSecondary }]}>SKU: {item.supplierSKU}</Text>
        )}

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: appTheme.colors.textSecondary }]}>Supplier Price</Text>
            <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{item.supplierPrice.toFixed(2)}</Text>
          </View>

          {item.minOrderQty != null && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: appTheme.colors.textSecondary }]}>Min Order Qty</Text>
              <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{item.minOrderQty}</Text>
            </View>
          )}

          {item.bulkPrice != null && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: appTheme.colors.textSecondary }]}>Bulk Price</Text>
              <Text style={[styles.detailValue, { color: appTheme.colors.primary }]}>{item.bulkPrice.toFixed(2)}</Text>
            </View>
          )}

          {item.bulkMinQty != null && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: appTheme.colors.textSecondary }]}>Bulk Min Qty</Text>
              <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{item.bulkMinQty}</Text>
            </View>
          )}

          {item.leadTimeDays != null && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: appTheme.colors.textSecondary }]}>Lead Time</Text>
              <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{item.leadTimeDays} days</Text>
            </View>
          )}
        </View>
      </View>
    ),
    [appTheme]
  );

  const keyExtractor = useCallback((item: SupplierProduct) => item.id, []);

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader
          title={`Products - ${supplierName}`}
          leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }}
          rightActions={[{ icon: 'add', onPress: handleAddProduct, accessibilityLabel: 'Add product' }]}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={`Products - ${supplierName}`}
        leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }}
        rightActions={[{ icon: 'add', onPress: handleAddProduct, accessibilityLabel: 'Add product' }]}
      />

      {error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: appTheme.colors.textSecondary }]}>{error}</Text>
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          iconName="cube-outline"
          title="No products yet"
          subtitle="Link products to this supplier to track pricing and availability."
          ctaLabel="Add Product"
          onCtaPress={handleAddProduct}
          testID="supplier-products-empty"
        />
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={appTheme.colors.primary}
            />
          }
        />
      )}

      {/* Add supplier product */}
      <AppBottomSheet
        visible={showAddSheet}
        onClose={handleCloseAddSheet}
        title="Add Supplier Product"
        fullHeight
      >
        <AppBottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!selectedProduct ? (
            <>
              <AppSearchBar
                placeholder="Search products"
                value={search}
                onChangeText={setSearch}
                containerStyle={styles.searchBar}
              />
              {catalogLoading ? (
                <View style={styles.sheetCenter}>
                  <ActivityIndicator color={appTheme.colors.primary} />
                </View>
              ) : availableProducts.length === 0 ? (
                <Text style={[styles.sheetEmpty, { color: appTheme.colors.textSecondary }]}>
                  {catalog.length === 0
                    ? 'No products in your catalog yet.'
                    : 'All catalog products are already linked to this supplier.'}
                </Text>
              ) : (
                availableProducts.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pickRow, { borderColor: appTheme.colors.borderColor }]}
                    onPress={() => setSelectedProduct(p)}
                  >
                    <Text style={[styles.pickName, { color: appTheme.colors.text }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Icon name="chevron-forward" size={18} color={appTheme.colors.textSecondary} />
                  </TouchableOpacity>
                ))
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.selectedRow, { borderColor: appTheme.colors.borderColor }]}
                onPress={() => setSelectedProduct(null)}
              >
                <View style={styles.selectedInfo}>
                  <Text style={[styles.selectedLabel, { color: appTheme.colors.textSecondary }]}>Product</Text>
                  <Text style={[styles.pickName, { color: appTheme.colors.text }]} numberOfLines={1}>
                    {selectedProduct.name}
                  </Text>
                </View>
                <Text style={[styles.changeLink, { color: appTheme.colors.primary }]}>Change</Text>
              </TouchableOpacity>

              <AppTextField
                label="Supplier Price"
                value={supplierPrice}
                onChangeText={setSupplierPrice}
                placeholder="0.00"
                keyboardType="numeric"
                required
                containerStyle={styles.field}
              />
              <AppTextField
                label="Min Order Qty (optional)"
                value={minOrderQty}
                onChangeText={setMinOrderQty}
                placeholder="e.g. 10"
                keyboardType="numeric"
                containerStyle={styles.field}
              />
              <AppTextField
                label="Bulk Price (optional)"
                value={bulkPrice}
                onChangeText={setBulkPrice}
                placeholder="0.00"
                keyboardType="numeric"
                containerStyle={styles.field}
              />
              <AppTextField
                label="Bulk Min Qty (optional)"
                value={bulkMinQty}
                onChangeText={setBulkMinQty}
                placeholder="e.g. 100"
                keyboardType="numeric"
                containerStyle={styles.field}
              />
              <AppTextField
                label="Supplier SKU (optional)"
                value={supplierSKU}
                onChangeText={setSupplierSKU}
                placeholder="Supplier's product code"
                containerStyle={styles.field}
              />
              <AppTextField
                label="Lead Time in Days (optional)"
                value={leadTimeDays}
                onChangeText={setLeadTimeDays}
                placeholder="e.g. 7"
                keyboardType="numeric"
                containerStyle={styles.field}
              />

              <AppButton
                title="Add Product"
                onPress={handleSaveSupplierProduct}
                loading={saving}
                disabled={saving}
                style={styles.saveBtn}
              />
            </>
          )}
        </AppBottomSheetScrollView>
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

  errorText: { fontSize: 16, textAlign: 'center' },

  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  productName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sku: { fontSize: 13, marginBottom: 10 },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  detailItem: {
    minWidth: '40%',
  },
  detailLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600' },

  // Add-product sheet
  sheetContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sheetCenter: { paddingVertical: 32, alignItems: 'center' },
  sheetEmpty: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  searchBar: { marginBottom: 12 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  selectedInfo: { flex: 1, marginRight: 8 },
  selectedLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', marginBottom: 2 },
  changeLink: { fontSize: 14, fontWeight: '600' },
  field: { marginBottom: 14 },
  saveBtn: { marginTop: 8 },
});
