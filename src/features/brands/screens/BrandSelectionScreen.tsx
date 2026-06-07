import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { Icon } from '@/shared/utils/icons';
import { ListItemCard } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { getBrands, Brand as ApiBrand } from '../brands.service';

type Props = NativeStackScreenProps<RootStackParamList, 'BrandSelection'>;

interface BrandItem {
  id: string;
  name: string;
  logo: string | null;
  productCount: number;
}

const BrandSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme: appTheme } = useTheme();
  const { activeBusiness } = useProfileStore();
  const companyId = activeBusiness?.id || '';
  const initialSelectedBrand = route.params?.selectedBrand || null;
  const [selectedBrand, setSelectedBrand] = useState<string | null>(initialSelectedBrand);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    const fetchBrands = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiBrands = await getBrands(companyId);
        if (cancelled) return;
        setBrands(
          apiBrands.map((b: ApiBrand) => ({
            id: b.id,
            name: b.name,
            logo: b.logoUrl || null,
            productCount: b._count?.products ?? 0,
          }))
        );
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Failed to load brands');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBrands();
    return () => { cancelled = true; };
  }, [companyId]);

  const handleBrandSelect = (brand: BrandItem) => {
    setSelectedBrand(brand.id);
    navigation.navigate('CreateProduct', { selectedBrand: brand.name, selectedBrandId: brand.id });
  };

  const handleCreateNewBrand = () => {
    navigation.navigate('CreateBrand');
  };

  const renderBrandItem = ({ item, index }: { item: BrandItem; index: number }) => {
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

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={appTheme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={{ color: appTheme.colors.textLight }}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={brands}
            renderItem={renderBrandItem}
            keyExtractor={(item) => item.id}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={10}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={{ color: appTheme.colors.textLight }}>No brands yet. Create one to get started.</Text>
              </View>
            }
          />
        )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});

export default BrandSelectionScreen;
