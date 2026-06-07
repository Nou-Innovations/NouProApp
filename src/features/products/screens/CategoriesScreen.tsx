/**
 * CategoriesScreen - Browse products by category.
 *
 * MVP: categories are the preset `BUSINESS_CATEGORIES` (plus any free-text
 * categories found on the business's products). Counts are derived from the
 * product list; tapping a category drills into the filtered product list
 * (ProductsSearch with a `category` param).
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { ListItemCard, EmptyState } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProducts } from '../hooks/useProducts';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/shared/constants/categories';

const norm = (s?: string) => (s || '').trim().toLowerCase();

type Row = { id: string; label: string; icon: string };

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const { products, loading } = useProducts();

  // Count products per normalized category key.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const key = norm(p.category);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [products]);

  const countFor = (row: Row) =>
    (counts.get(norm(row.id)) || 0) + (row.id !== row.label ? counts.get(norm(row.label)) || 0 : 0);

  // Free-text categories on products that aren't part of the preset list.
  const rows = useMemo<Row[]>(() => {
    const presetKeys = new Set<string>();
    BUSINESS_CATEGORIES.forEach((c) => {
      presetKeys.add(norm(c.id));
      presetKeys.add(norm(c.label));
    });
    const extras: Row[] = [];
    counts.forEach((_, key) => {
      if (!presetKeys.has(key)) extras.push({ id: key, label: key, icon: 'pricetag-outline' });
    });
    return [...BUSINESS_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon })), ...extras];
  }, [counts]);

  const openCategory = (row: Row) =>
    navigation.navigate('ProductsSearch', { category: row.id, filter: 'myProducts' });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Categories"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => {
            const n = countFor(item);
            return (
              <ListItemCard
                avatar={{ type: 'icon', icon: item.icon }}
                title={getCategoryLabel(item.id)}
                subtitle={`${n} product${n !== 1 ? 's' : ''}`}
                showChevron
                onPress={() => openCategory(item)}
              />
            );
          }}
          ListEmptyComponent={
            <EmptyState
              iconName="grid-outline"
              title="No categories"
              subtitle="Categories appear here as you tag products."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
