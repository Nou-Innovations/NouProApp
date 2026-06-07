/**
 * SuppliersScreen
 *
 * List screen displaying all suppliers with search and loading states.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import { EmptyState, Skeleton, SkeletonRow, SkeletonColumn } from '@/shared/components/ui';
import { useSuppliers } from '../hooks/useSuppliers';
import SupplierCard from '../components/SupplierCard';
import type { Supplier } from '@/shared/types/procurement';

export default function SuppliersScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();

  const {
    suppliers,
    loading,
    refreshing,
    search,
    setSearch,
    refresh,
  } = useSuppliers();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {/* Primary Header */}
      <PrimaryHeader
        title="Suppliers"
        actions={[
          {
            icon: 'plus',
            onPress: () => (navigation as any).navigate('AddSupplier'),
            accessibilityLabel: 'Add supplier',
          },
        ]}
      />

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
        <AppSearchBar
          placeholder="Search suppliers..."
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          containerStyle={styles.searchBarContainer}
        />
      </View>

      {/* Supplier List */}
      <FlatList<Supplier>
        data={loading ? [] : suppliers}
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
        renderItem={({ item }) => (
          <SupplierCard
            supplier={item}
            onPress={() =>
              (navigation as any).navigate('SupplierDetail', { supplierId: item.id })
            }
          />
        )}
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
                      <Skeleton width={40} height={40} borderRadius={20} />
                      <SkeletonColumn gap={6} style={{ flex: 1 }}>
                        <Skeleton width="55%" height={16} />
                        <Skeleton width="70%" height={13} />
                      </SkeletonColumn>
                      <Skeleton width={70} height={24} borderRadius={12} />
                    </SkeletonRow>
                    <SkeletonRow gap={8}>
                      <Skeleton width={16} height={16} borderRadius={4} />
                      <Skeleton width="40%" height={14} />
                    </SkeletonRow>
                  </View>
                ))}
              </View>
            );
          }

          return (
            <EmptyState
              iconName="people-outline"
              title="No suppliers"
              subtitle="Add your first supplier to start managing procurement."
              ctaLabel="Add Supplier"
              onCtaPress={() => (navigation as any).navigate('AddSupplier')}
              testID="empty-suppliers"
            />
          );
        }}
        contentContainerStyle={suppliers.length === 0 ? { flex: 1 } : { flexGrow: 1 }}
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
  skeletonCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
});
