import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { Icon } from '@/shared/utils/icons';
import mockProducts from '@/shared/data/mockProducts';

type Props = NativeStackScreenProps<RootStackParamList, 'BrandSelection'>;

interface Brand {
  id: string;
  name: string;
  logo: string | null;
  productCount: number;
}

const BrandSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  // Process products to get unique brands with product counts
  const brands = useMemo(() => {
    const brandMap = new Map<string, { logo: string | null; productCount: number }>();
    mockProducts.forEach(product => {
      if (!brandMap.has(product.brand)) {
        brandMap.set(product.brand, { logo: product.brandLogo || null, productCount: 0 });
      }
      const brandData = brandMap.get(product.brand)!;
      brandData.productCount++;
    });
    return Array.from(brandMap.entries()).map(([name, data]) => ({
      id: name,
      name,
      logo: data.logo,
      productCount: data.productCount
    }));
  }, []);

  const handleBrandSelect = (brand: Brand) => {
    setSelectedBrand(brand.id);
    navigation.navigate('CreateProduct', { selectedBrand: brand.name });
  };

  const handleCreateNewBrand = () => {
    navigation.navigate('CreateBrand');
  };

  const renderBrandItem = ({ item }: { item: Brand }) => {
    const isSelected = selectedBrand === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.cardContainer,
          isSelected && styles.selectedCardContainer
        ]}
        onPress={() => handleBrandSelect(item)}
      >
        <View style={styles.cardContent}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Icon name="business-outline" size={24} color={isSelected ? "#FFFFFF" : "#4B5563"} />
            </View>
          )}
          <View style={styles.textContainer}>
            <Text style={[styles.brandName, isSelected && styles.selectedText]}>{item.name}</Text>
            <Text style={[styles.productCount, isSelected && styles.selectedText]}>
              {item.productCount} product{item.productCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <SecondaryHeader
        title="Select Brand"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.createNewButton}
          onPress={handleCreateNewBrand}
        >
          <Text style={styles.plusIcon}>+</Text>
          <Text style={styles.createNewText}>Create New Brand</Text>
        </TouchableOpacity>

        <FlatList
          data={brands}
          renderItem={renderBrandItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  plusIcon: {
    fontSize: 24,
    color: '#000000',
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  createNewText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  listContainer: {
    paddingTop: 8,
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedCardContainer: {
    backgroundColor: '#000000',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
});

export default BrandSelectionScreen; 