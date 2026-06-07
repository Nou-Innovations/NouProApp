/**
 * TransfersScreen - Stock transfers between the business's own locations.
 *
 * Transfers are deliveries with `type === 'transfer'`. This screen reuses the
 * existing deliveries data (useDeliveries) filtered to transfers and the shared
 * DeliveryCard. The "+" action opens CreateDelivery in transfer mode.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState } from '@/shared/components/ui';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import LocationDropdown from '@/shared/components/ui/LocationDropdown';
import DeliveryCard from '@/features/deliveries/components/DeliveryCard';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { canManageDeliveries, canCreateDeliveries, checkPaywall } from '@/shared/utils/permissions';
import { useDeliveries } from '../hooks/useDeliveries';
import type { Delivery } from '@/shared/types/delivery';

export default function TransfersScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const currentUserRole = useProfileStore((s) => s.currentUserRole);
  const activeBusiness = useProfileStore((s) => s.activeBusiness);

  const { deliveries, loading, refreshing, search, setSearch, refresh } = useDeliveries();

  const transfers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deliveries
      .filter((d) => d.type === 'transfer')
      .filter(
        (d) =>
          !q ||
          (d.clientCompanyName || '').toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q),
      );
  }, [deliveries, search]);

  const handleCreate = () => {
    if (!canManageDeliveries(currentUserRole)) {
      Alert.alert('Access Denied', 'Only admins can create transfers.');
      return;
    }
    if (!canCreateDeliveries(activeBusiness?.plan || null)) {
      const check = checkPaywall('create_selling_order', activeBusiness?.plan || null);
      if (!check.allowed) {
        Alert.alert('Upgrade required', check.message || 'Upgrade your plan to create transfers.');
        return;
      }
    }
    navigation.navigate('CreateDelivery', { mode: 'transfer' });
  };

  const openDetail = (d: Delivery) => navigation.navigate('DeliveryDetail', { deliveryId: d.id });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Transfers"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'add', onPress: handleCreate, accessibilityLabel: 'New transfer' }]}
      />
      <View style={styles.locationRow}>
        <LocationDropdown style={{ flex: 1 }} />
      </View>
      <AppSearchBar
        placeholder="Search transfers"
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        containerStyle={styles.search}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : transfers.length === 0 ? (
        <EmptyState
          iconName="swap-horizontal-outline"
          title="No transfers yet"
          subtitle="Move stock between your locations."
          ctaLabel="New transfer"
          onCtaPress={handleCreate}
        />
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => <DeliveryCard delivery={item} onPress={() => openDetail(item)} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={appTheme.colors.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  locationRow: { paddingHorizontal: 12, paddingTop: 4, flexDirection: 'row' },
  search: { marginHorizontal: 12, marginTop: 4, marginBottom: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
