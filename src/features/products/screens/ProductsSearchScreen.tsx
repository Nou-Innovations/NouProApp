import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import theme from '@/shared/theme';
import mockProducts, { Product } from '@/shared/data/mockProducts';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';

// Helper function to highlight matched text in bold
const HighlightText = ({ text, highlight }) => {
  if (!highlight || !highlight.trim()) {
    return <Text style={styles.itemName}>{text}</Text>;
  }
  
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  
  return (
    <Text style={styles.itemName}>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? 
        <Text key={i} style={styles.highlightedText}>{part}</Text> : 
        <Text key={i}>{part}</Text>
      )}
    </Text>
  );
};

// Group products by brand
const groupProductsByBrand = (products: Product[]) => {
  const brands = {};
  products.forEach(product => {
    if (!brands[product.brand]) {
      brands[product.brand] = {
        name: product.brand,
        logo: product.brandLogo,
        products: []
      };
    }
    brands[product.brand].products.push(product);
  });
  return Object.values(brands);
};

type ProductsSearchScreenRouteParams = {
  ProductsSearch: {
    query: string;
    filter: 'myProducts' | 'myBrands' | 'allProducts' | 'allBrands';
  };
};

const ProductsSearchScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ProductsSearchScreenRouteParams, 'ProductsSearch'>>();
  const [searchQuery, setSearchQuery] = React.useState(route.params?.query || '');
  const filter = route.params?.filter || 'allProducts';

  // In a real app, this would be fetched from an API or Redux store
  // For now, we'll simulate "my products" as the first 10 products
  const myProducts = mockProducts.slice(0, 10);
  const allProducts = mockProducts;

  // Get brands
  const myBrands = useMemo(() => groupProductsByBrand(myProducts), [myProducts]);
  const allBrands = useMemo(() => groupProductsByBrand(allProducts), [allProducts]);

  // Filter based on search query and filter type
  const filteredData = useMemo(() => {
    if (filter === 'myProducts') {
      return myProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else if (filter === 'allProducts') {
      return allProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else if (filter === 'myBrands') {
      return myBrands.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else { // allBrands
      return allBrands.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }, [searchQuery, filter, myProducts, allProducts, myBrands, allBrands]);

  // Get the title based on filter
  const getTitle = () => {
    switch (filter) {
      case 'myProducts': return 'My Products';
      case 'myBrands': return 'My Brands';
      case 'allProducts': return 'All Products';
      case 'allBrands': return 'All Brands';
      default: return 'Search Results';
    }
  };

  // Render functions based on filter type
  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate(
        'ProductDetail' as never, 
        { productId: item.id } as never
      )}
    >
      <Image 
        source={{ uri: item.productPicture || 'https://via.placeholder.com/40' }} 
        style={styles.productImage} 
      />
      <View style={styles.itemContent}>
        <HighlightText text={item.name} highlight={searchQuery} />
        <Text style={styles.brandName}>{item.brand}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderBrandItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate('BrandSelection', { initialBrand: item.name })}
    >
      <Image 
        source={{ uri: item.logo || 'https://via.placeholder.com/40' }} 
        style={styles.brandImage} 
      />
      <View style={styles.itemContent}>
        <HighlightText text={item.name} highlight={searchQuery} />
        <Text style={styles.itemSubtext}>{item.products.length} products</Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = (filter === 'myProducts' || filter === 'allProducts') 
    ? renderProductItem 
    : renderBrandItem;

  return (
    <SafeAreaView style={styles.container}>
      <SecondaryHeader
        title={`${getTitle()}: ${searchQuery}`}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <AppSearchBar 
        placeholder={`Search in ${getTitle().toLowerCase()}`}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
        containerStyle={styles.searchBar}
      />
      <FlatList
        data={filteredData}
        keyExtractor={(item: any) => item.id || item.name}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No results found matching "{searchQuery}"</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 16,
    backgroundColor: '#F3F4F6',
  },
  brandImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: '#F3F4F6',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 2,
  },
  brandName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  itemSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    color: '#374151',
  },
  highlightedText: {
    fontWeight: 'bold',
    color: '#111827',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ProductsSearchScreen; 