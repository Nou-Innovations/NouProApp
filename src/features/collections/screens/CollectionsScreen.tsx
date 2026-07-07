/**
 * CollectionsScreen — manage internal product collections (list / create / edit / delete).
 *
 * Lives as a hidden tab in BusinessTabNavigator (opened from the sidebar → in-shell
 * with hamburger + bottom bar). Any plan can create collections up to a per-plan quota
 * (Free = 3); hitting the cap shows the upgrade modal. Backed by collections.service.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { ListItemCard, EmptyState } from '@/shared/components/ui';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SubscriptionPlan, maxCollectionsForPlan } from '@/shared/types/subscription';
import { getCollections, deleteCollection, Collection } from '../collections.service';

// The next tier up — used as the upgrade target when the quota is reached.
const NEXT_PLAN: Record<SubscriptionPlan, SubscriptionPlan> = {
  free: 'pro',
  pro: 'business',
  business: 'enterprise',
  enterprise: 'enterprise',
};

export default function CollectionsScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const plan = (activeBusiness?.plan || 'free') as SubscriptionPlan;

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const limit = maxCollectionsForPlan(plan);
  const atLimit = collections.length >= limit;
  const limitLabel = limit === Infinity ? '∞' : String(limit);

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getCollections(companyId);
      setCollections(data);
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to load collections');
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
    if (atLimit) {
      setShowPaywall(true);
      return;
    }
    navigation.navigate('CreateCollection', { manage: true });
  };

  const openEdit = (c: Collection) =>
    navigation.navigate('CreateCollection', { manage: true, collectionId: c.id });

  const confirmDelete = (c: Collection) => {
    AppAlert.alert('Delete collection', `Delete "${c.name}"? The products themselves are not deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCollection(companyId, c.id);
            setCollections((prev) => prev.filter((x) => x.id !== c.id));
          } catch (e: any) {
            AppAlert.alert('Error', e?.message || 'Failed to delete collection');
          }
        },
      },
    ]);
  };

  const subtitle = (c: Collection) => {
    const count = c._count?.products ?? c.products?.length ?? 0;
    const parts = [`${count} product${count !== 1 ? 's' : ''}`];
    if (!c.isActive) parts.push('inactive');
    return parts.join(' · ');
  };

  const renderItem = ({ item }: { item: Collection }) => (
    <ListItemCard
      avatar={{ type: 'icon', icon: 'folder-outline' }}
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
        title="Collections"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
        rightActions={[{ icon: 'add', onPress: openCreate, accessibilityLabel: 'Create collection' }]}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : collections.length === 0 ? (
        <EmptyState
          iconName="folder-outline"
          title="No collections yet"
          subtitle="Group related products into a collection to organize your catalog."
          ctaLabel="Create collection"
          onCtaPress={openCreate}
        />
      ) : (
        <>
          <Text style={[styles.countLabel, { color: appTheme.colors.textLight }]}>
            {collections.length} / {limitLabel} collections
          </Text>
          <FlatList data={collections} keyExtractor={(c) => c.id} renderItem={renderItem} />
        </>
      )}

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          navigation.navigate('SubscriptionPlans');
        }}
        requiredPlan={NEXT_PLAN[plan]}
        title="Collection limit reached"
        description={`Your ${plan} plan includes ${limitLabel} collection${limit === 1 ? '' : 's'}. Upgrade to create more.`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  countLabel: { fontSize: 13, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
});
