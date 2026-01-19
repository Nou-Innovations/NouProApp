import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { Icon } from '@/shared/utils/icons';
import mockProducts from '@/shared/data/mockProducts';
import { ListItemCard } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'BrandSelection'>;

interface Brand {
  id: string;
  name: string;
  logo: string | null;
  productCount: number;
}

const BrandSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme: appTheme } = useTheme();
  // Get the initially selected brand from route params
  const initialSelectedBrand = route.params?.selectedBrand || null;
  const [selectedBrand, setSelectedBrand] = useState<string | null>(initialSelectedBrand);

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

  const renderBrandItem = ({ item, index }: { item: Brand; index: number }) => {
    const isSelected = selectedBrand === item.name;
    return (
      <ListItemCard
        avatar={{
          type: 'image',
          imageUri: item.logo,
          userId: item.id,
          userName: item.name,
        }}
        title={item.name}
        subtitle={`${item.productCount} product${item.productCount !== 1 ? 's' : ''}`}
        onPress={() => handleBrandSelect(item)}
        showDivider={index < brands.length - 1}
        selected={isSelected}
        showCheckmark={isSelected}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Select Brand"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.createNewButton, { borderBottomColor: appTheme.colors.divider }]}
          onPress={handleCreateNewBrand}
        >
          <Icon name="add" size={24} color={appTheme.colors.text} />
          <Text style={[styles.createNewText, { color: appTheme.colors.text }]}>Create New Brand</Text>
        </TouchableOpacity>

        <FlatList
          data={brands}
          renderItem={renderBrandItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  createNewText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  listContainer: {
  },
});

export default BrandSelectionScreen; 