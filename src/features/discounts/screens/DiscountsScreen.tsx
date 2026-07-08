/**
 * DiscountsScreen — seller promotions + coupon codes (list / create / edit / delete).
 *
 * Hidden tab in BusinessTabNavigator (opened from the sidebar → in-shell). Creating a
 * discount is Pro+ (paywall shown to Free; also enforced backend-side). Backed by
 * discounts.service.
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
import { SubscriptionPlan } from '@/shared/types/subscription';
import { getDiscounts, deleteDiscount, Discount } from '../discounts.service';

function summarize(d: Discount): string {
  const val = d.type === 'PERCENTAGE' ? `${d.value}%` : `Rs ${d.value}`;
  const parts = [`${val} off`];
  if (d.scope === 'PRODUCTS') parts.push(`${d.productIds?.length || 0} products`);
  else if (d.scope === 'CATEGORY') parts.push(`${d.categories?.length || 0} categories`);
  else parts.push('everything');
  if (d.code) parts.push(`code ${d.code}`);
  if (!d.isActive) parts.push('inactive');
  return parts.join(' · ');
}

export default function DiscountsScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const plan = (activeBusiness?.plan || 'free') as SubscriptionPlan;

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try { setDiscounts(await getDiscounts(companyId)); }
    catch (e: any) { AppAlert.alert('Error', e?.message || 'Failed to load discounts'); }
    finally { setLoading(false); }
  }, [companyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openCreate = () => {
    if (plan === 'free') { setShowPaywall(true); return; }
    navigation.navigate('CreateDiscount', {});
  };
  const openEdit = (d: Discount) => navigation.navigate('CreateDiscount', { discountId: d.id });

  const confirmDelete = (d: Discount) => {
    AppAlert.alert('Delete discount', `Delete "${d.name}"? Prices return to normal.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDiscount(companyId, d.id);
            setDiscounts((prev) => prev.filter((x) => x.id !== d.id));
          } catch (e: any) {
            AppAlert.alert('Error', e?.message || 'Failed to delete discount');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Discount }) => (
    <ListItemCard
      avatar={{ type: 'icon', icon: item.code ? 'pricetag-outline' : 'megaphone-outline' }}
      title={item.name}
      subtitle={summarize(item)}
      onPress={() => openEdit(item)}
      showOptionsButton
      onOptionsPress={() => confirmDelete(item)}
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Discounts"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
        rightActions={[{ icon: 'add', onPress: openCreate, accessibilityLabel: 'Create discount' }]}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={appTheme.colors.primary} /></View>
      ) : discounts.length === 0 ? (
        <EmptyState
          iconName="pricetag-outline"
          title="No discounts yet"
          subtitle="Run a promotion or create a coupon code. It applies automatically to matching products and orders."
          ctaLabel="Create discount"
          onCtaPress={openCreate}
        />
      ) : (
        <FlatList data={discounts} keyExtractor={(d) => d.id} renderItem={renderItem} />
      )}

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => { setShowPaywall(false); navigation.navigate('SubscriptionPlans'); }}
        requiredPlan="pro"
        title="Discounts are a Pro feature"
        description="Upgrade to Pro to run promotions and create coupon codes."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
