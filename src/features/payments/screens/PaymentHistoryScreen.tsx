import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState, SkeletonListItem } from '@/shared/components/ui';
import FilterBar from '@/shared/components/ui/FilterBar';
import { useProfileStore } from '@/shared/store/profileStore';
import PaymentCard from '../components/PaymentCard';
import { usePayments } from '../hooks/usePayments';

const FILTERS = ['All', 'Subscriptions', 'Invoices'];
const FILTER_TYPE_MAP: Record<string, string | undefined> = {
  All: undefined,
  Subscriptions: 'SUBSCRIPTION',
  Invoices: 'INVOICE_PAYMENT',
};

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonListItem key={i} lines={3} showTimestamp />
      ))}
    </View>
  );
}

export default function PaymentHistoryScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const [activeFilter, setActiveFilter] = useState('All');
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const businessId = activeBusiness?.id || '';

  const { payments, loading, refreshing, loadMore, refresh, hasMore } = usePayments(
    businessId,
    FILTER_TYPE_MAP[activeFilter]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Payment History"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <View style={styles.filterContainer}>
        <FilterBar
          statuses={FILTERS}
          selectedStatus={activeFilter}
          onSelectStatus={setActiveFilter}
        />
      </View>
      {loading && payments.length === 0 ? (
        <LoadingSkeleton />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PaymentCard payment={item} />}
          contentContainerStyle={styles.list}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          refreshing={refreshing}
          onRefresh={refresh}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={appTheme.colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              iconName="Receipt"
              title="No payments yet"
              subtitle="Your payment history will appear here"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
