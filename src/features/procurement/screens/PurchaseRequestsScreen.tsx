/**
 * PurchaseRequestsScreen
 *
 * List screen showing purchase requests with status filtering and search.
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
import { usePurchaseRequests } from '../hooks/usePurchaseRequests';
import ProcurementStatusBadge from '../components/ProcurementStatusBadge';
import type { PurchaseRequest, PurchaseRequestFilterTab } from '@/shared/types/procurement';
import { PR_FILTER_TABS } from '@/shared/types/procurement';

export default function PurchaseRequestsScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();

  const {
    purchaseRequests,
    loading,
    refreshing,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    refresh,
  } = usePurchaseRequests();

  const renderItem = ({ item }: { item: PurchaseRequest }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderBottomColor: appTheme.colors.borderColor }]}
      onPress={() =>
        (navigation as any).navigate('PurchaseRequestDetail', { requestId: item.id })
      }
      activeOpacity={0.7}
    >
      {/* Header: ID + Status */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
          {item.id.slice(0, 8)}
        </Text>
        <ProcurementStatusBadge status={item.status} type="pr" />
      </View>

      {/* Supplier */}
      {item.supplier ? (
        <Text style={[styles.cardSubtitle, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
          {item.supplier.name}
        </Text>
      ) : null}

      {/* Bottom: Items count + Priority */}
      <View style={styles.cardFooter}>
        <Text style={[styles.cardMeta, { color: appTheme.colors.textMuted }]}>
          {item.items.length} item{item.items.length !== 1 ? 's' : ''}
          {item.totalAmount != null ? ` - $${item.totalAmount.toFixed(2)}` : ''}
        </Text>
        <ProcurementStatusBadge status={item.priority} type="priority" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {/* Primary Header */}
      <SecondaryHeader
        title="Requests"
        rightActions={[
          {
            icon: 'plus',
            onPress: () => (navigation as any).navigate('CreatePurchaseRequest'),
            accessibilityLabel: 'Create purchase request',
          },
        ]}
      />

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
        <AppSearchBar
          placeholder="Search requests..."
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          containerStyle={styles.searchBarContainer}
        />
      </View>

      {/* Filter Bar */}
      <FilterBar
        statuses={PR_FILTER_TABS}
        selectedStatus={statusFilter}
        onSelectStatus={(status) => setStatusFilter(status as PurchaseRequestFilterTab)}
        containerStyle={{ flexGrow: 0 }}
      />

      {/* Purchase Requests List */}
      <FlatList<PurchaseRequest>
        data={loading ? [] : purchaseRequests}
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
                        <Skeleton width="50%" height={16} />
                        <Skeleton width="70%" height={13} />
                      </SkeletonColumn>
                      <Skeleton width={70} height={24} borderRadius={12} />
                    </SkeletonRow>
                    <SkeletonRow gap={8}>
                      <Skeleton width="35%" height={13} />
                      <Skeleton width={60} height={22} borderRadius={10} />
                    </SkeletonRow>
                  </View>
                ))}
              </View>
            );
          }

          return (
            <EmptyState
              iconName="document-text-outline"
              title="No purchase requests"
              subtitle="Create a purchase request to start the procurement workflow."
              ctaLabel="New Request"
              onCtaPress={() => (navigation as any).navigate('CreatePurchaseRequest')}
              testID="empty-purchase-requests"
            />
          );
        }}
        contentContainerStyle={purchaseRequests.length === 0 ? { flex: 1 } : { flexGrow: 1 }}
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
  /* Skeleton */
  skeletonCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
});
