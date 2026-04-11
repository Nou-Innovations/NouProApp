import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppButton from '@/shared/components/ui/AppButton';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/format';
import { getProducts } from '@/features/products/products.service';
import { useProfileStore } from '@/shared/store/profileStore';

// Product type for selection
interface SelectableProduct {
  id: string;
  name: string;
  brandName: string;
  price: number;
  imageUrl?: string;
  unit?: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'SelectProductsForBrand'>;

const SelectProductsForBrandScreen: React.FC<Props> = ({ navigation, route }) => {
  const { brandName, selectedProducts: initialProducts } = route.params;
  const [selectedProducts, setSelectedProducts] = useState<SelectableProduct[]>(initialProducts || []);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);

  // Fetch all products from API
  const [allProducts, setAllProducts] = useState<SelectableProduct[]>([]);

  useEffect(() => {
    const companyId = activeBusiness?.id;
    if (!companyId) return;
    getProducts({ companyId }).then(products => {
      setAllProducts(products.map(p => ({
        id: p.id,
        name: p.name,
        brandName: p.brand || '',
        price: p.price || 0,
        imageUrl: p.productPicture,
        unit: p.unit,
      })));
    }).catch(() => setAllProducts([]));
  }, [activeBusiness?.id]);

  // Filtered products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return allProducts;
    const searchLower = searchQuery.toLowerCase();
    return allProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.brandName.toLowerCase().includes(searchLower)
    );
  }, [allProducts, searchQuery]);

  const handleToggleProduct = (product: SelectableProduct) => {
    const isSelected = selectedProducts.some((p) => p.id === product.id);
    if (isSelected) {
      setSelectedProducts((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      setSelectedProducts((prev) => [...prev, product]);
    }
  };

  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p) => p.id === productId);
  };

  const handleConfirm = () => {
    navigation.navigate('CreateBrand', { selectedProducts });
  };

  const handleCreateNewProduct = () => {
    navigation.navigate('CreateProduct', { selectedBrand: brandName || 'New Brand' });
  };

  const renderProductItem = ({ item }: { item: SelectableProduct }) => {
    const isSelected = isProductSelected(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.productItem,
          { 
            backgroundColor: appTheme.colors.cardBackground, 
            borderColor: isSelected ? appTheme.colors.primary : appTheme.colors.borderColor,
          },
        ]}
        onPress={() => handleToggleProduct(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productInfo}>
          <Text style={[styles.productBrand, { color: appTheme.colors.textLight, fontFamily: theme.fonts.primary.medium }]}>
            {item.brandName}
          </Text>
          <Text style={[styles.productName, { color: appTheme.colors.text, fontFamily: theme.fonts.primary.semiBold }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.productPrice, { color: appTheme.colors.primary, fontFamily: theme.fonts.primary.bold }]}>
            {formatCurrency(item.price)}
          </Text>
        </View>

        <View style={[
          styles.checkbox,
          isSelected 
            ? { backgroundColor: appTheme.colors.primary, borderColor: appTheme.colors.primary }
            : { backgroundColor: 'transparent', borderColor: appTheme.colors.borderColor }
        ]}>
          {isSelected && <Icon name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="cube-outline" size={48} color={appTheme.colors.textMuted} />
      <Text style={[styles.emptyText, { color: appTheme.colors.textMuted }]}>
        No products found
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Select Products"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <AppSearchBar
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
          {selectedProducts.length > 0 && (
            <Text style={[styles.selectionCount, { color: appTheme.colors.textSecondary }]}>
              {selectedProducts.length} selected
            </Text>
          )}
        </View>

        {/* Products List */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
        />

        {/* Bottom Buttons */}
        <View style={[styles.bottomContainer, { backgroundColor: appTheme.colors.background, borderTopColor: appTheme.colors.borderColor }]}>
          <AppButton
            title={`Confirm${selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ''}`}
            onPress={handleConfirm}
            style={styles.confirmButton}
          />
          <AppButton
            title="Create New Product"
            onPress={handleCreateNewProduct}
            variant="outline"
            style={styles.createButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  selectionCount: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'right',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
  },
  productBrand: {
    fontSize: 12,
    marginBottom: 2,
  },
  productName: {
    fontSize: 15,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  confirmButton: {
    width: '100%',
  },
  createButton: {
    width: '100%',
  },
});

export default SelectProductsForBrandScreen;
