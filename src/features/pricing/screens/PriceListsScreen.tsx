/**
 * PriceListsScreen — manage customer-specific price lists (list / create / edit / delete).
 *
 * Lives as a hidden tab in BusinessTabNavigator (opened from the sidebar → in-shell
 * with hamburger + bottom bar). Gated behind the Business plan: FREE/PRO users see the
 * upgrade modal when tapping "Create". Backed by priceLists.service.
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { ListItemCard, EmptyState } from '@/shared/components/ui';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { checkPaywall, PaywallCheck } from '@/shared/utils/permissions';
import { getPriceLists, deletePriceList } from '../priceLists.service';
import { PriceList } from '@/shared/types/pricing';

export default function PriceListsScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [paywall, setPaywall] = useState<PaywallCheck | null>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getPriceLists(companyId);
      setLists(data);
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to load price lists');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openCreate = () => {
    const check = checkPaywall('business_specific_pricing', activeBusiness?.plan || null);
    if (!check.allowed) {
      setPaywall(check);
      return;
    }
    navigation.navigate('CreatePriceList', { manage: true });
  };

  const openEdit = (l: PriceList) => navigation.navigate('CreatePriceList', { manage: true, listId: l.id });

  const confirmDelete = (l: PriceList) => {
    AppAlert.alert('Delete price list', `Delete "${l.name}"? Customers on it revert to base pricing.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePriceList(companyId, l.id);
            setLists((prev) => prev.filter((x) => x.id !== l.id));
          } catch (e: any) {
            AppAlert.alert('Error', e?.message || 'Failed to delete price list');
          }
        },
      },
    ]);
  };

  const subtitle = (l: PriceList) => {
    const parts: string[] = [];
    if (typeof l.discountPercent === 'number' && l.discountPercent > 0) parts.push(`${l.discountPercent}% off`);
    const items = l._count?.items ?? l.items?.length ?? 0;
    const customers = l._count?.assignments ?? l.assignments?.length ?? 0;
    parts.push(`${items} override${items !== 1 ? 's' : ''}`);
    parts.push(`${customers} customer${customers !== 1 ? 's' : ''}`);
    if (l.isDefault) parts.push('default');
    if (!l.isActive) parts.push('inactive');
    return parts.join(' · ');
  };

  const renderItem = ({ item }: { item: PriceList }) => (
    <ListItemCard
      avatar={{ type: 'icon', icon: 'pricetags-outline' }}
      title={item.name}
      subtitle={subtitle(item)}
      onPress={() => openEdit(item)}
      showOptionsButton
      onOptionsPress={() => confirmDelete(item)}
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Price lists"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
        rightActions={[{ icon: 'add', onPress: openCreate, accessibilityLabel: 'Create price list' }]}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : lists.length === 0 ? (
        <EmptyState
          iconName="pricetags-outline"
          title="No price lists yet"
          subtitle="Create a list to charge specific customers custom prices."
          ctaLabel="Create price list"
          onCtaPress={openCreate}
        />
      ) : (
        <FlatList data={lists} keyExtractor={(l) => l.id} renderItem={renderItem} />
      )}

      <PaywallModal
        visible={!!paywall}
        onClose={() => setPaywall(null)}
        onUpgrade={() => {
          setPaywall(null);
          navigation.navigate('SubscriptionPlans');
        }}
        requiredPlan={paywall?.requiredPlan || 'business'}
        modalType={paywall?.modalType}
        title={paywall?.title}
        description={paywall?.description}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
