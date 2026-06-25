/**
 * SupplierProductsScreen
 *
 * Shows the list of products linked to a specific supplier.
 * Displays product name, supplier price, min order qty, and bulk pricing.
 * "+" action in the header opens a placeholder alert for adding products.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState } from '@/shared/components/ui';
import type { SupplierProduct } from '@/shared/types/procurement';
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

  // ── Add product placeholder ──
  const handleAddProduct = useCallback(() => {
    AppAlert.alert('Add Product', 'Add supplier product functionality coming soon.');
  }, []);

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
});
