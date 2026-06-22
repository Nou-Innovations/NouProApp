/**
 * PurchaseOrdersScreen
 *
 * List screen showing purchase orders with status filtering and search.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import FilterBar from '@/shared/components/ui/FilterBar';
import { EmptyState, Skeleton, SkeletonRow, SkeletonColumn } from '@/shared/components/ui';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';
import ProcurementStatusBadge from '../components/ProcurementStatusBadge';
import type { PurchaseOrder, PurchaseOrderFilterTab } from '@/shared/types/procurement';
import { PO_FILTER_TABS } from '@/shared/types/procurement';

export default function PurchaseOrdersScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();

  const {
    purchaseOrders,
    loading,
    refreshing,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    refresh,
  } = usePurchaseOrders();

  const renderItem = ({ item }: { item: PurchaseOrder }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderBottomColor: appTheme.colors.borderColor }]}
      onPress={() =>
        (navigation as any).navigate('PurchaseOrderDetail', { orderId: item.id })
      }
      activeOpacity={0.7}
    >
      {/* Header: PO number + Status */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
          {item.poNumber || item.id.slice(0, 8)}
        </Text>
        <ProcurementStatusBadge status={item.status} type="po" />
      </View>

      {/* Supplier */}
      {item.supplier ? (
        <Text style={[styles.cardSubtitle, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
          {item.supplier.name}
        </Text>
      ) : null}

      {/* Bottom: Items count + Total */}
      <View style={styles.cardFooter}>
        <Text style={[styles.cardMeta, { color: appTheme.colors.textMuted }]}>
          {item.items.length} item{item.items.length !== 1 ? 's' : ''}
        </Text>
        {item.totalAmount != null ? (
          <Text style={[styles.cardTotal, { color: appTheme.colors.text }]}>
            ${item.totalAmount.toFixed(2)}
          </Text>
        ) : null}
      </View>

      {/* Expected delivery date */}
      {item.expectedDeliveryDate ? (
        <Text style={[styles.cardDate, { color: appTheme.colors.textMuted }]}>
          Expected: {new Date(item.expectedDeliveryDate).toLocaleDateString()}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {/* Primary Header */}
      <SecondaryHeader
        title="Orders"
        rightActions={[
          {
            icon: 'plus',
            onPress: () => (navigation as any).navigate('CreatePurchaseOrder'),
            accessibilityLabel: 'Create purchase order',
          },
        ]}
      />

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
        <AppSearchBar
          placeholder="Search orders..."
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          containerStyle={styles.searchBarContainer}
        />
      </View>

      {/* Filter Bar */}
      <FilterBar
        statuses={PO_FILTER_TABS}
        selectedStatus={statusFilter}
        onSelectStatus={(status) => setStatusFilter(status as PurchaseOrderFilterTab)}
        containerStyle={{ flexGrow: 0 }}
      />

      {/* Purchase Orders List */}
      <FlatList<PurchaseOrder>
        data={loading ? [] : purchaseOrders}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={appTheme.colors.primary}
          />
        }
        renderItem={renderItem}
        ListEmptyComponent={() => {
          if (loading) {
            return (
              <View style={{ paddingTop: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.skeletonCard,
                      { backgroundColor: appTheme.colors.cardBackground },
                    ]}
                  >
                    <SkeletonRow gap={12} style={{ marginBottom: 12 }}>
                      <SkeletonColumn gap={6} style={{ flex: 1 }}>
                        <Skeleton width="45%" height={16} />
                        <Skeleton width="65%" height={13} />
                      </SkeletonColumn>
                      <Skeleton width={80} height={24} borderRadius={12} />
                    </SkeletonRow>
                    <SkeletonRow gap={8} style={{ marginBottom: 6 }}>
                      <Skeleton width="30%" height={13} />
                      <View style={{ flex: 1 }} />
                      <Skeleton width={60} height={14} />
                    </SkeletonRow>
                    <Skeleton width="50%" height={12} />
                  </View>
                ))}
              </View>
            );
          }

          return (
            <EmptyState
              iconName="cart-outline"
              title="No purchase orders"
              subtitle="Create a purchase order to track your procurement."
              ctaLabel="New Order"
              onCtaPress={() => (navigation as any).navigate('CreatePurchaseOrder')}
              testID="empty-purchase-orders"
            />
          );
        }}
        contentContainerStyle={purchaseOrders.length === 0 ? { flex: 1 } : { flexGrow: 1 }}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  searchBarContainer: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 8,
  },
  /* Card */
  card: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 13,
    fontWeight: '400',
  },
  cardTotal: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 6,
  },
  /* Skeleton */
  skeletonCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
});
