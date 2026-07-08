/**
 * CustomersScreen — the sell-side CRM directory (list / search / add).
 *
 * Lives as a hidden tab in BusinessTabNavigator (opened from the sidebar → in-shell
 * with hamburger + bottom bar). Free for all plans. On first open with an empty
 * directory it auto-imports customers from past invoices/orders (seedCustomers).
 * Tap a row → CustomerDetail. Backed by customers.service.
 */
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { ListItemCard, EmptyState, AppSearchBar } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { getCustomers, seedCustomers, Customer } from '../customers.service';

export default function CustomersScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const didSeedRef = useRef(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      let data = await getCustomers(companyId);
      // First-run: auto-import from past invoices/orders so the directory isn't empty.
      if (data.length === 0 && !didSeedRef.current) {
        didSeedRef.current = true;
        try {
          const res = await seedCustomers(companyId);
          if (res.created > 0) data = await getCustomers(companyId);
        } catch {
          /* seeding is best-effort; an empty directory is still valid */
        }
      }
      setCustomers(data);
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const runImport = async () => {
    try {
      const res = await seedCustomers(companyId);
      await load();
      AppAlert.alert('Import complete', res.created > 0
        ? `Added ${res.created} customer${res.created === 1 ? '' : 's'} from your invoices and orders.`
        : 'No new customers found in your invoices and orders.');
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to import customers');
    }
  };

  const openCreate = () => navigation.navigate('AddCustomer', {});
  const openDetail = (c: Customer) => navigation.navigate('CustomerDetail', { customerId: c.id });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter((c) =>
        [c.name, c.contactName, c.email, c.phone].some((f) => (f || '').toLowerCase().includes(q)))
    : customers;

  const subtitle = (c: Customer) => {
    const parts = [c.email || c.phone || 'No contact info'];
    if (c.customerBusiness) parts.push('Linked');
    if (c.status === 'ARCHIVED') parts.push('archived');
    return parts.join(' · ');
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <ListItemCard
      avatar={
        item.customerBusiness?.logoUrl
          ? { type: 'image', imageUri: item.customerBusiness.logoUrl, userName: item.name }
          : { type: 'initials', userName: item.name }
      }
      title={item.name}
      subtitle={subtitle(item)}
      onPress={() => openDetail(item)}
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Customers"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
        rightActions={[
          { icon: 'download-outline', onPress: runImport, accessibilityLabel: 'Import from invoices' },
          { icon: 'add', onPress: openCreate, accessibilityLabel: 'Add customer' },
        ]}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : customers.length === 0 ? (
        <EmptyState
          iconName="people-outline"
          title="No customers yet"
          subtitle="Add the businesses and people you sell to. They also appear automatically when you invoice them."
          ctaLabel="Add customer"
          onCtaPress={openCreate}
        />
      ) : (
        <>
          <View style={styles.searchWrap}>
            <AppSearchBar value={search} onChangeText={setSearch} placeholder="Search customers…" />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.noResults, { color: appTheme.colors.textLight }]}>No customers match “{search}”.</Text>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  noResults: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
