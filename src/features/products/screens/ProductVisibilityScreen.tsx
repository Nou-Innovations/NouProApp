/**
 * ProductVisibilityScreen - Control which products are listed (visible to buyers).
 *
 * Each product gets a "Listed" switch backed by `toggleProductListed`
 * (PATCH /products { is_listed }). The backend enforces the plan's
 * `maxListedProducts` limit and returns a paywall on 403 (handled by the
 * shared api layer); we optimistically flip and revert on failure.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { ListItemCard, EmptyState } from '@/shared/components/ui';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { useProducts } from '../hooks/useProducts';
import { toggleProductListed } from '../products.service';
import type { UIProduct } from '@/shared/types/product';

export default function ProductVisibilityScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const { products, loading, updateProductLocal } = useProducts();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const listedCount = useMemo(() => products.filter((p) => p.is_listed).length, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
  }, [products, search]);

  const onToggle = async (p: UIProduct, next: boolean) => {
    setBusyId(p.id);
    updateProductLocal(p.id, { is_listed: next }); // optimistic
    try {
      await toggleProductListed(companyId, p.id, next);
    } catch (e: any) {
      updateProductLocal(p.id, { is_listed: !next }); // revert
      Alert.alert('Could not update', e?.message || 'Failed to update visibility.');
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }: { item: UIProduct }) => (
    <ListItemCard
      avatar={{
        type: item.productPicture ? 'image' : 'icon',
        imageUri: item.productPicture,
        icon: 'cube-outline',
        userId: item.id,
        userName: item.name,
      }}
      title={item.name}
      subtitle={item.is_listed ? 'Listed — visible to buyers' : 'Hidden from buyers'}
      rightColumn={
        <Switch
          value={!!item.is_listed}
          onValueChange={(v) => onToggle(item, v)}
          disabled={busyId === item.id}
          trackColor={{ true: appTheme.colors.primary, false: appTheme.colors.borderColor }}
        />
      }
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Visibility"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
      />
      <Text style={[styles.summary, { color: appTheme.colors.textMuted }]}>
        {listedCount} listed · {products.length} total
      </Text>
      <AppSearchBar
        placeholder="Search products"
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        containerStyle={styles.search}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          iconName="eye-outline"
          title="No products"
          subtitle="Add products, then choose which ones buyers can see."
        />
      ) : (
        <FlatList data={filtered} keyExtractor={(p) => p.id} renderItem={renderItem} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  summary: { fontSize: 13, paddingHorizontal: 16, paddingTop: 4 },
  search: { marginHorizontal: 12, marginTop: 4, marginBottom: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
