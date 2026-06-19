/**
 * OrdersScreen
 * Tabbed list of Incoming (we are the seller) and Outgoing (we are the buyer)
 * orders. Mirrors the Invoices list pattern.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState } from '@/shared/components/ui';
import { Text } from '@/shared/components/ui/Typography';
import { OrderCard } from '@/features/orders/components';
import { useOrders } from '../hooks/useOrders';

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;
type Tab = 'incoming' | 'outgoing';

export default function OrdersScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();
  const [tab, setTab] = useState<Tab>(route.params?.initialTab || 'incoming');

  const { incoming, outgoing, loading, error, refetch } = useOrders();

  // `refreshing` drives the pull-to-refresh spinner ONLY for a real user pull.
  // It is intentionally kept separate from `loading`: binding the RefreshControl
  // to `loading` makes iOS programmatically activate the spinner on every focus
  // (useFocusEffect → refetch → loading=true), which leaves a stuck content inset
  // (a blank gap at the top of the list) after returning from a detail screen.
  const [refreshing, setRefreshing] = useState(false);

  // Refetch on focus (background refresh — no spinner). Also apply a freshly-passed
  // `initialTab` param: OrdersScreen is now a persistent hidden tab, so the mount-time
  // initializer above only runs once — later navigations (e.g. dashboard "incoming" vs
  // PlaceOrder "outgoing") must update the tab here, then clear the param so it doesn't
  // re-apply on every focus.
  useFocusEffect(
    useCallback(() => {
      refetch();
      const requestedTab = route.params?.initialTab;
      if (requestedTab) {
        setTab(requestedTab);
        navigation.setParams({ initialTab: undefined });
      }
    }, [refetch, route.params?.initialTab, navigation])
  );

  // User-initiated pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const data = tab === 'incoming' ? incoming : outgoing;

  const renderTab = (key: Tab, label: string, count: number) => {
    const active = tab === key;
    return (
      <TouchableOpacity
        style={[
          styles.tab,
          { borderBottomColor: active ? appTheme.colors.primary : 'transparent' },
        ]}
        onPress={() => setTab(key)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            { color: active ? appTheme.colors.primary : appTheme.colors.textLight },
          ]}
        >
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title="Orders"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
      />

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: appTheme.colors.borderColor }]}>
        {renderTab('incoming', 'Incoming', incoming.length)}
        {renderTab('outgoing', 'Outgoing', outgoing.length)}
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              type={tab}
              onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={appTheme.colors.primary} />
          }
          ListEmptyComponent={
            error ? (
              <EmptyState
                iconName="alert-circle-outline"
                title="Couldn't load orders"
                subtitle={error}
                ctaLabel="Retry"
                onCtaPress={refetch}
                testID="orders-error"
              />
            ) : (
              <EmptyState
                iconName="cube-outline"
                title={tab === 'incoming' ? 'No incoming orders' : 'No orders placed'}
                subtitle={
                  tab === 'incoming'
                    ? 'Orders placed to your business will appear here.'
                    : 'Orders you place with suppliers will appear here.'
                }
                testID="orders-empty"
              />
            )
          }
          contentContainerStyle={[styles.listContent, data.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 14, fontFamily: theme.fonts.primary.bold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xl },
});
