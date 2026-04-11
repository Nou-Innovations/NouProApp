/**
 * SupplierDetailScreen
 *
 * Detail screen showing supplier contact info, stats,
 * and recent purchase orders for the supplier.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { Icon } from '@/shared/utils/icons';
import ProcurementStatusBadge from '../components/ProcurementStatusBadge';
import * as procurementService from '../services/procurement.service';
import { useProcurementStore } from '../store/procurement.store';
import type { Supplier, PurchaseOrder } from '@/shared/types/procurement';

type SupplierDetailParams = {
  SupplierDetail: { supplierId: string };
};

export default function SupplierDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SupplierDetailParams, 'SupplierDetail'>>();
  const { supplierId } = route.params;
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id || '';

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get related POs from store
  const supplierPOs = useProcurementStore((s) =>
    s.purchaseOrders.filter((po) => po.supplierId === supplierId),
  );

  const fetchSupplier = useCallback(
    async (isRefresh = false) => {
      if (!businessId) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await procurementService.getSupplier(businessId, supplierId);
        setSupplier(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load supplier');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [businessId, supplierId],
  );

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  const handleRefresh = useCallback(() => fetchSupplier(true), [fetchSupplier]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
        edges={['top']}
      >
        <SecondaryHeader
          title="Supplier"
          leftAction={{
            icon: 'chevron-left',
            onPress: () => navigation.goBack(),
            accessibilityLabel: 'Go back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: appTheme.colors.textSecondary }]}>
            Loading supplier...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !supplier) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
        edges={['top']}
      >
        <SecondaryHeader
          title="Supplier"
          leftAction={{
            icon: 'chevron-left',
            onPress: () => navigation.goBack(),
            accessibilityLabel: 'Go back',
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: appTheme.colors.error }]}>
            {error || 'Supplier not found'}
          </Text>
          <TouchableOpacity
            onPress={() => fetchSupplier()}
            style={[styles.retryButton, { backgroundColor: appTheme.colors.primary }]}
          >
            <Text style={{ color: appTheme.colors.textInverse, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title={supplier.name}
        leftAction={{
          icon: 'chevron-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Go back',
        }}
        rightActions={[
          {
            icon: 'pencil-outline',
            onPress: () =>
              (navigation as any).navigate('AddSupplier', { supplierId: supplier.id }),
            accessibilityLabel: 'Edit supplier',
          },
        ]}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={appTheme.colors.primary}
          />
        }
      >
        {/* ── Contact Info ── */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          <Text style={[styles.cardTitle, { color: appTheme.colors.text }]}>Contact Information</Text>

          {supplier.contactName ? (
            <View style={styles.infoRow}>
              <Icon name="person-outline" size={18} color={appTheme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: appTheme.colors.text }]}>
                {supplier.contactName}
              </Text>
            </View>
          ) : null}

          {supplier.email ? (
            <View style={styles.infoRow}>
              <Icon name="mail-outline" size={18} color={appTheme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: appTheme.colors.text }]}>
                {supplier.email}
              </Text>
            </View>
          ) : null}

          {supplier.phone ? (
            <View style={styles.infoRow}>
              <Icon name="call-outline" size={18} color={appTheme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: appTheme.colors.text }]}>
                {supplier.phone}
              </Text>
            </View>
          ) : null}

          {supplier.address ? (
            <View style={styles.infoRow}>
              <Icon name="location-outline" size={18} color={appTheme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: appTheme.colors.text }]}>
                {supplier.address}
              </Text>
            </View>
          ) : null}

          {!supplier.contactName && !supplier.email && !supplier.phone && !supplier.address ? (
            <Text style={[styles.noDataText, { color: appTheme.colors.textMuted }]}>
              No contact information provided
            </Text>
          ) : null}
        </View>

        {/* ── Stats ── */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          <Text style={[styles.cardTitle, { color: appTheme.colors.text }]}>Details</Text>

          <View style={styles.statsGrid}>
            {/* Status */}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>Status</Text>
              <ProcurementStatusBadge status={supplier.status} type="supplier" />
            </View>

            {/* Payment Terms */}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>Payment Terms</Text>
              <Text style={[styles.statValue, { color: appTheme.colors.text }]}>
                {supplier.paymentTerms || '—'}
              </Text>
            </View>

            {/* Lead Time */}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>Lead Time</Text>
              <Text style={[styles.statValue, { color: appTheme.colors.text }]}>
                {supplier.leadTimeDays != null ? `${supplier.leadTimeDays} days` : '—'}
              </Text>
            </View>

            {/* Rating */}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>Rating</Text>
              {supplier.rating != null ? (
                <View style={styles.ratingRow}>
                  <Icon name="star" size={16} color={appTheme.colors.warning} />
                  <Text style={[styles.statValue, { color: appTheme.colors.text }]}>
                    {supplier.rating.toFixed(1)}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.statValue, { color: appTheme.colors.text }]}>—</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {supplier.notes ? (
          <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.cardTitle, { color: appTheme.colors.text }]}>Notes</Text>
            <Text style={[styles.notesText, { color: appTheme.colors.textSecondary }]}>
              {supplier.notes}
            </Text>
          </View>
        ) : null}

        {/* ── Recent POs ── */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          <Text style={[styles.cardTitle, { color: appTheme.colors.text }]}>
            Recent Purchase Orders
          </Text>

          {supplierPOs.length === 0 ? (
            <Text style={[styles.noDataText, { color: appTheme.colors.textMuted }]}>
              No purchase orders for this supplier
            </Text>
          ) : (
            supplierPOs.slice(0, 5).map((po) => (
              <TouchableOpacity
                key={po.id}
                style={[styles.poItem, { borderBottomColor: appTheme.colors.borderColor }]}
                onPress={() =>
                  (navigation as any).navigate('PurchaseOrderDetail', { orderId: po.id })
                }
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.poTitle, { color: appTheme.colors.text }]}
                    numberOfLines={1}
                  >
                    {po.poNumber || po.id.slice(0, 8)}
                  </Text>
                  <Text style={[styles.poSubtitle, { color: appTheme.colors.textSecondary }]}>
                    {po.items.length} item{po.items.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <ProcurementStatusBadge status={po.status} type="po" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  /* Cards */
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  /* Contact info */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '400',
    flex: 1,
  },
  /* Stats */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    width: '45%',
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  /* Notes */
  notesText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 14,
    fontWeight: '400',
  },
  /* PO list */
  poItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  poTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  poSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
});
