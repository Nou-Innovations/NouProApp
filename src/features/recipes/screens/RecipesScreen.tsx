/**
 * RecipesScreen — bill-of-materials recipes (list / create / edit / delete).
 *
 * Hidden tab in BusinessTabNavigator (sidebar → in-shell). Any plan can create
 * recipes up to a per-plan quota (Free = 3); hitting the cap shows the upgrade
 * modal. Each row shows the recipe's cost/unit + margin. Backed by recipes.service.
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
import { SubscriptionPlan, maxRecipesForPlan } from '@/shared/types/subscription';
import { formatCurrency } from '@/shared/utils/format';
import { getRecipes, deleteRecipe, Recipe } from '../recipes.service';

const NEXT_PLAN: Record<SubscriptionPlan, SubscriptionPlan> = {
  free: 'pro', pro: 'business', business: 'enterprise', enterprise: 'enterprise',
};

export default function RecipesScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const plan = (activeBusiness?.plan || 'free') as SubscriptionPlan;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const limit = maxRecipesForPlan(plan);
  const atLimit = recipes.length >= limit;
  const limitLabel = limit === Infinity ? '∞' : String(limit);

  const load = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try { setRecipes(await getRecipes(companyId)); }
    catch (e: any) { AppAlert.alert('Error', e?.message || 'Failed to load recipes'); }
    finally { setLoading(false); }
  }, [companyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openCreate = () => {
    if (atLimit) { setShowPaywall(true); return; }
    navigation.navigate('CreateRecipe', {});
  };
  const openEdit = (r: Recipe) => navigation.navigate('CreateRecipe', { recipeId: r.id });

  const confirmDelete = (r: Recipe) => {
    AppAlert.alert('Delete recipe', `Delete "${r.name}"? The products themselves are not deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecipe(companyId, r.id);
            setRecipes((prev) => prev.filter((x) => x.id !== r.id));
          } catch (e: any) {
            AppAlert.alert('Error', e?.message || 'Failed to delete recipe');
          }
        },
      },
    ]);
  };

  const subtitle = (r: Recipe) => {
    const parts = [
      `${r.ingredients.length} ingredient${r.ingredients.length !== 1 ? 's' : ''}`,
      `${formatCurrency(r.cost.costPerUnit)}/unit`,
    ];
    if (r.cost.marginPct != null) parts.push(`${r.cost.marginPct}% margin`);
    return parts.join(' · ');
  };

  const renderItem = ({ item }: { item: Recipe }) => (
    <ListItemCard
      avatar={
        item.product?.productPicture
          ? { type: 'image', imageUri: item.product.productPicture, userName: item.name }
          : { type: 'icon', icon: 'restaurant-outline' }
      }
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
        title="Recipes"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
        rightActions={[{ icon: 'add', onPress: openCreate, accessibilityLabel: 'Create recipe' }]}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={appTheme.colors.primary} /></View>
      ) : recipes.length === 0 ? (
        <EmptyState
          iconName="restaurant-outline"
          title="No recipes yet"
          subtitle="Build a recipe from your products to see its ingredient cost and margin."
          ctaLabel="Create recipe"
          onCtaPress={openCreate}
        />
      ) : (
        <>
          <Text style={[styles.countLabel, { color: appTheme.colors.textLight }]}>{recipes.length} / {limitLabel} recipes</Text>
          <FlatList data={recipes} keyExtractor={(r) => r.id} renderItem={renderItem} />
        </>
      )}

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => { setShowPaywall(false); navigation.navigate('SubscriptionPlans'); }}
        requiredPlan={NEXT_PLAN[plan]}
        title="Recipe limit reached"
        description={`Your ${plan} plan includes ${limitLabel} recipe${limit === 1 ? '' : 's'}. Upgrade to create more.`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  countLabel: { fontSize: 13, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
});
