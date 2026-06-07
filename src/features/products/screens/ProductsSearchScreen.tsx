/**
 * ProductsSearchScreen
 *
 * Full search results for products/brands, reached from the "See more" buttons
 * in ProductSearchResultsList. Shows the complete (un-truncated) list for one
 * of four filters: my products, my brands, all products, all brands.
 *
 * - "My" filters use the active business's products (useProducts).
 * - "All" filters use the public catalog (getPublicProducts).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProducts } from '../hooks/useProducts';
import { getPublicProducts } from '../products.service';
import { useProfileStore } from '@/shared/store/profileStore';
import type { UIProduct } from '@/shared/types/product';

type FilterKey = 'myProducts' | 'myBrands' | 'allProducts' | 'allBrands';

interface BrandGroup {
  name: string;
  logo?: string;
  products: UIProduct[];
}

const FILTER_TITLES: Record<FilterKey, string> = {
  myProducts: 'My Products',
  myBrands: 'My Brands',
  allProducts: 'All Products',
  allBrands: 'All Brands',
};

const groupProductsByBrand = (products: UIProduct[]): BrandGroup[] => {
  const brands: Record<string, BrandGroup> = {};
  products.forEach((product) => {
    const brand = product.brand || 'Other';
    if (!brands[brand]) {
      brands[brand] = { name: brand, logo: product.brandLogo, products: [] };
    }
    brands[brand].products.push(product);
  });
  return Object.values(brands);
};

export default function ProductsSearchScreen({ navigation, route }: { navigation: any; route: any }) {
  const insets = useSafeAreaInsets();
  const { theme: appTheme } = useTheme();

  const filter: FilterKey = route.params?.filter || 'allProducts';
  const initialQuery: string = route.params?.query || '';
  const [query, setQuery] = useState(initialQuery);

  const isMine = filter === 'myProducts' || filter === 'myBrands';
  const isBrandView = filter === 'myBrands' || filter === 'allBrands';

  // "My" products come from the active business.
  const { products: myProducts, loading: myLoading } = useProducts({ autoFetch: isMine });
  const activeBusinessId = useProfileStore((state) => state.activeBusinessId);

  // "All" products come from the public catalog.
  const [allProducts, setAllProducts] = useState<UIProduct[]>([]);
  const [allLoading, setAllLoading] = useState(!isMine);

  useEffect(() => {
    if (isMine) return;
    let cancelled = false;
    setAllLoading(true);
    getPublicProducts(activeBusinessId || undefined)
      .then((data) => { if (!cancelled) setAllProducts(data || []); })
      .catch(() => { if (!cancelled) setAllProducts([]); })
      .finally(() => { if (!cancelled) setAllLoading(false); });
    return () => { cancelled = true; };
  }, [isMine, activeBusinessId]);

  const sourceProducts = isMine ? myProducts : allProducts;
  const loading = isMine ? myLoading : allLoading;

  const q = query.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    if (isBrandView) return [];
    return sourceProducts.filter((p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q),
    );
  }, [isBrandView, sourceProducts, q]);

  const filteredBrands = useMemo(() => {
    if (!isBrandView) return [];
    return groupProductsByBrand(sourceProducts).filter((b) =>
      !q || b.name.toLowerCase().includes(q),
    );
  }, [isBrandView, sourceProducts, q]);

  const renderProduct = ({ item }: { item: UIProduct }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.productPicture || 'https://via.placeholder.com/50' }}
        style={styles.productImage}
      />
      <View style={styles.rowContent}>
        <Text style={[styles.itemName, { color: appTheme.colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.itemSub, { color: appTheme.colors.secondary }]} numberOfLines={1}>
          {(item as any).priceHidden ? 'Price on request' : `Rs ${item.price?.toFixed(2) ?? '0.00'}`}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color={appTheme.colors.iconMuted} />
    </TouchableOpacity>
  );

  const renderBrand = ({ item }: { item: BrandGroup }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={() => navigation.navigate('BrandSelection', { initialBrand: item.name })}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.logo || 'https://via.placeholder.com/50' }}
        style={styles.brandImage}
      />
      <View style={styles.rowContent}>
        <Text style={[styles.itemName, { color: appTheme.colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.itemSub, { color: appTheme.colors.secondary }]}>{item.products.length} products</Text>
      </View>
      <Icon name="chevron-forward" size={18} color={appTheme.colors.iconMuted} />
    </TouchableOpacity>
  );

  const isEmpty = isBrandView ? filteredBrands.length === 0 : filteredProducts.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="chevron-back" size={24} color={appTheme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appTheme.colors.text }]}>{FILTER_TITLES[filter]}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor }]}>
        <Icon name="search-outline" size={18} color={appTheme.colors.iconMuted} />
        <TextInput
          style={[styles.searchInput, { color: appTheme.colors.text }]}
          placeholder={`Search ${FILTER_TITLES[filter].toLowerCase()}`}
          placeholderTextColor={appTheme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={18} color={appTheme.colors.iconMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={appTheme.colors.primary} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: appTheme.colors.textLight }]}>
            {q ? `No results matching "${query}"` : 'Nothing to show yet'}
          </Text>
        </View>
      ) : isBrandView ? (
        <FlatList
          data={filteredBrands}
          keyExtractor={(b) => b.name}
          renderItem={renderBrand}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(p) => p.id}
          renderItem={renderProduct}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 48,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.primary.semiBold,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 14,
    backgroundColor: '#F3F4F6',
  },
  brandImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
    backgroundColor: '#F3F4F6',
  },
  rowContent: { flex: 1 },
  itemName: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: 3,
  },
  itemSub: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: theme.fonts.primary.regular,
  },
});
