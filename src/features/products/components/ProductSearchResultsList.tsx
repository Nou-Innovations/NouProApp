import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { SectionTitle } from '@/shared/components/ui';
import theme from '@/shared/theme';
import type { UIProduct } from '@/shared/types/product';

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
const groupProductsByBrand = (products: UIProduct[]) => {
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

interface ProductSearchResultsListProps {
  searchQuery: string;
  allProducts: UIProduct[];
  myProducts: UIProduct[];
  visible: boolean;
}

const ProductSearchResultsList: React.FC<ProductSearchResultsListProps> = ({
  searchQuery,
  allProducts,
  myProducts,
  visible,
}) => {
  const navigation = useNavigation();

  if (!visible || !searchQuery) {
    return null;
  }

  // Get My Products that match the query
  const filteredMyProducts = myProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 4);

  // Get All Products that match the query (excluding my products to avoid duplication)
  const myProductIds = new Set(myProducts.map(p => p.id));
  const filteredAllProducts = allProducts
    .filter(product => 
      !myProductIds.has(product.id) && 
      (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       product.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .slice(0, 4);

  // Get My Brands
  const myBrands = groupProductsByBrand(myProducts);
  const filteredMyBrands = myBrands
    .filter(brand => brand.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 4);

  // Get All Brands (excluding my brands)
  const myBrandNames = new Set(myBrands.map(b => b.name));
  const allBrands = groupProductsByBrand(allProducts);
  const filteredAllBrands = allBrands
    .filter(brand => 
      !myBrandNames.has(brand.name) && 
      brand.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 4);

  // If no results at all, show no results message
  if (
    filteredMyProducts.length === 0 && 
    filteredAllProducts.length === 0 &&
    filteredMyBrands.length === 0 &&
    filteredAllBrands.length === 0
  ) {
    return (
      <View style={styles.container}>
        <Text style={styles.noResultsText}>No products or brands found matching "{searchQuery}"</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* My Products Section */}
      {filteredMyProducts.length > 0 && (
        <View style={styles.section}>
          <SectionTitle style={styles.sectionTitle}>My Products</SectionTitle>
          {filteredMyProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.itemContainer}
              onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
            >
              <Image 
                source={{ uri: product.productPicture || 'https://via.placeholder.com/40' }} 
                style={styles.productImage} 
              />
              <View style={styles.itemContent}>
                <HighlightText text={product.name} highlight={searchQuery} />
                <Text style={styles.itemPrice}>
                  {(product as any).priceHidden ? 'Price on request' : `Rs ${product.price?.toFixed(2) ?? '0.00'}`}
                </Text>
              </View>
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>{product.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {myProducts.length > 4 && (
            <TouchableOpacity 
              style={styles.seeMoreContainer}
              onPress={() => navigation.navigate('ProductsSearch', { query: searchQuery, filter: 'myProducts' })}
            >
              <Text style={styles.seeMoreText}>See more my products</Text>
              <Icon name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* My Brands Section */}
      {filteredMyBrands.length > 0 && (
        <View style={styles.section}>
          <SectionTitle style={styles.sectionTitle}>My Brands</SectionTitle>
          {filteredMyBrands.map((brand) => (
            <TouchableOpacity
              key={brand.name}
              style={styles.itemContainer}
              onPress={() => navigation.navigate('BrandSelection', { initialBrand: brand.name })}
            >
              <Image 
                source={{ uri: brand.logo || 'https://via.placeholder.com/40' }} 
                style={styles.brandImage} 
              />
              <View style={styles.itemContent}>
                <HighlightText text={brand.name} highlight={searchQuery} />
                <Text style={styles.itemSubtext}>{brand.products.length} products</Text>
              </View>
            </TouchableOpacity>
          ))}
          {myBrands.length > 4 && (
            <TouchableOpacity 
              style={styles.seeMoreContainer}
              onPress={() => navigation.navigate('ProductsSearch', { query: searchQuery, filter: 'myBrands' })}
            >
              <Text style={styles.seeMoreText}>See more my brands</Text>
              <Icon name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* All Products Section */}
      {filteredAllProducts.length > 0 && (
        <View style={styles.section}>
          <SectionTitle style={styles.sectionTitle}>All Products</SectionTitle>
          {filteredAllProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.itemContainer}
              onPress={() => navigation.navigate('ProductDetail' as never, { productId: product.id } as never)}
            >
              <Image 
                source={{ uri: product.productPicture || 'https://via.placeholder.com/40' }} 
                style={styles.productImage} 
              />
              <View style={styles.itemContent}>
                <HighlightText text={product.name} highlight={searchQuery} />
                <Text style={styles.itemPrice}>
                  {(product as any).priceHidden ? 'Price on request' : `Rs ${product.price?.toFixed(2) ?? '0.00'}`}
                </Text>
              </View>
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>{product.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {allProducts.length > 4 && (
            <TouchableOpacity 
              style={styles.seeMoreContainer}
              onPress={() => navigation.navigate('ProductsSearch', { query: searchQuery, filter: 'allProducts' })}
            >
              <Text style={styles.seeMoreText}>See more products</Text>
              <Icon name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* All Brands Section */}
      {filteredAllBrands.length > 0 && (
        <View style={styles.section}>
          <SectionTitle style={styles.sectionTitle}>All Brands</SectionTitle>
          {filteredAllBrands.map((brand) => (
            <TouchableOpacity
              key={brand.name}
              style={styles.itemContainer}
              onPress={() => navigation.navigate('BrandSelection', { initialBrand: brand.name })}
            >
              <Image 
                source={{ uri: brand.logo || 'https://via.placeholder.com/40' }} 
                style={styles.brandImage} 
              />
              <View style={styles.itemContent}>
                <HighlightText text={brand.name} highlight={searchQuery} />
                <Text style={styles.itemSubtext}>{brand.products.length} products</Text>
              </View>
            </TouchableOpacity>
          ))}
          {allBrands.length > 4 && (
            <TouchableOpacity 
              style={styles.seeMoreContainer}
              onPress={() => navigation.navigate('ProductsSearch', { query: searchQuery, filter: 'allBrands' })}
            >
              <Text style={styles.seeMoreText}>See more brands</Text>
              <Icon name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAF8F5',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE6DF',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 16,
    backgroundColor: '#FAF8F5',
  },
  brandImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    backgroundColor: '#FAF8F5',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#1C1917',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#57534E',
  },
  itemSubtext: {
    fontSize: 14,
    color: '#57534E',
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FAF8F5',
  },
  statusText: {
    fontSize: 12,
    color: '#57534E',
  },
  highlightedText: {
    fontWeight: 'bold',
    color: '#1C1917',
  },
  seeMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE6DF',
  },
  seeMoreText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: 4,
  },
  noResultsText: {
    fontSize: 16,
    color: '#57534E',
    textAlign: 'center',
    padding: 20,
  },
});

export default ProductSearchResultsList; 