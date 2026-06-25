/**
 * BrandsScreen - Manage the business's brands (list / create / edit / delete).
 *
 * Backed by the existing brands.service CRUD. The "+" header action and the
 * empty-state CTA open CreateBrand in manage mode; tapping a row opens it in
 * edit mode; the row's options button deletes (admin only on the backend).
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { ListItemCard, EmptyState } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { getBrands, deleteBrand, Brand } from '../brands.service';

export default function BrandsScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getBrands(companyId);
      setBrands(data);
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Backend returns brands with an embedded `products` array; older shapes use `_count`.
  const productCount = (b: Brand) => (b as any).products?.length ?? b._count?.products ?? 0;

  const openCreate = () => navigation.navigate('CreateBrand', { manage: true });

  const openEdit = (b: Brand) =>
    navigation.navigate('CreateBrand', {
      manage: true,
      brand: { id: b.id, name: b.name, logoUrl: b.logoUrl ?? null, description: b.description ?? null },
    });

  const confirmDelete = (b: Brand) => {
    AppAlert.alert('Delete brand', `Delete "${b.name}"? Products keep their data but lose this brand.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBrand(companyId, b.id);
            setBrands((prev) => prev.filter((x) => x.id !== b.id));
          } catch (e: any) {
            AppAlert.alert('Error', e?.message || 'Failed to delete brand');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Brand }) => {
    const n = productCount(item);
    return (
      <ListItemCard
        avatar={{ type: 'image', imageUri: item.logoUrl, userId: item.id, userName: item.name }}
        title={item.name}
        subtitle={`${n} product${n !== 1 ? 's' : ''}`}
        onPress={() => openEdit(item)}
        showOptionsButton
        onOptionsPress={() => confirmDelete(item)}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Brands"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
        rightActions={[{ icon: 'add', onPress: openCreate, accessibilityLabel: 'Create brand' }]}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : brands.length === 0 ? (
        <EmptyState
          iconName="bookmark-outline"
          title="No brands yet"
          subtitle="Create your first brand to organise products."
          ctaLabel="Create brand"
          onCtaPress={openCreate}
        />
      ) : (
        <FlatList data={brands} keyExtractor={(b) => b.id} renderItem={renderItem} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
