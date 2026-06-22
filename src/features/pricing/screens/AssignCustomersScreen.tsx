/**
 * AssignCustomersScreen — attach customer businesses to a price list.
 *
 * Lists the seller's accepted business connections; toggling assigns/unassigns the
 * customer to this list. One list per customer per seller: assigning a customer who
 * is already on another list moves them (server upsert). Backed by priceLists.service.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { ListItemCard, EmptyState } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  getPriceList, setAssignment, removeAssignment,
  getConnectedBusinesses, ConnectedBusiness,
} from '../priceLists.service';

type Props = NativeStackScreenProps<RootStackParamList, 'AssignCustomers'>;

const AssignCustomersScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme: appTheme } = useTheme();
  const c = appTheme.colors;
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const { listId } = route.params;

  const [customers, setCustomers] = useState<ConnectedBusiness[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try {
      const [list, conns] = await Promise.all([
        getPriceList(companyId, listId),
        getConnectedBusinesses(companyId),
      ]);
      setAssigned(new Set((list.assignments || []).map((a) => a.buyerBusinessId)));
      setCustomers(conns);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [companyId, listId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (buyerBusinessId: string, next: boolean) => {
    setBusy((b) => new Set(b).add(buyerBusinessId));
    // optimistic
    setAssigned((prev) => {
      const s = new Set(prev);
      if (next) s.add(buyerBusinessId); else s.delete(buyerBusinessId);
      return s;
    });
    try {
      if (next) await setAssignment(companyId, listId, buyerBusinessId);
      else await removeAssignment(companyId, listId, buyerBusinessId);
    } catch (e: any) {
      // revert
      setAssigned((prev) => {
        const s = new Set(prev);
        if (next) s.delete(buyerBusinessId); else s.add(buyerBusinessId);
        return s;
      });
      Alert.alert('Error', e?.message || 'Failed to update assignment');
    } finally {
      setBusy((b) => {
        const s = new Set(b);
        s.delete(buyerBusinessId);
        return s;
      });
    }
  };

  const renderItem = ({ item }: { item: ConnectedBusiness }) => {
    const id = item.business.id;
    const isOn = assigned.has(id);
    return (
      <ListItemCard
        avatar={{ type: 'image', imageUri: item.business.logoUrl, userId: id, userName: item.business.name }}
        title={item.business.name}
        subtitle={isOn ? 'On this list' : 'Base pricing'}
        centerRightColumn
        rightColumn={
          busy.has(id)
            ? <ActivityIndicator color={c.primary} />
            : <Switch value={isOn} onValueChange={(v) => toggle(id, v)} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <SecondaryHeader title="Assign customers" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
      ) : customers.length === 0 ? (
        <EmptyState
          iconName="people-outline"
          title="No connected customers"
          subtitle="Connect with customer businesses first, then assign them to this price list."
        />
      ) : (
        <FlatList data={customers} keyExtractor={(x) => x.business.id} renderItem={renderItem} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AssignCustomersScreen;
