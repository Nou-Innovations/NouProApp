import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { productService } from '../services/products';
import ProductCard from '../components/ProductCard';
import { Feather as Icon } from '@expo/vector-icons';

export default function ProductsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { products, selectedLocation } = useStore();

  useEffect(() => {
    if (selectedLocation) {
      productService.fetchProducts(selectedLocation.id);
    }
  }, [selectedLocation]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map(p => p.category)));

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      onPress={() => setSelectedCategory(selectedCategory === item ? null : item)}
      className={`px-4 py-2 rounded-full mr-2 ${
        selectedCategory === item ? 'bg-primary' : 'bg-gray-200'
      }`}
    >
      <Text
        className={`${
          selectedCategory === item ? 'text-white' : 'text-gray-700'
        }`}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }) => (
    <ProductCard
      name={item.name}
      brand={item.brand}
      price={item.price}
      imageUrl={item.imageUrl}
      stockStatus={item.stockStatus}
      onPress={() => {
        // TODO: Navigate to product details
      }}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <View className="px-4 py-2 bg-card border-b border-gray-200">
          <Text className="text-xl font-bold">Products</Text>
        </View>
        
        {/* Tabs */}
        <View className="flex-row border-b border-gray-200">
          <View className="flex-1 p-4 border-b-2 border-primary">
            <Text className="text-center font-semibold text-primary">My Products</Text>
          </View>
          <View className="flex-1 p-4">
            <Text className="text-center font-semibold text-gray-500">Overall Products</Text>
          </View>
        </View>
        
        <ScrollView className="flex-1">
          <View className="p-4 border-b border-gray-200">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search products..."
              className="bg-gray-100 rounded-full px-4 py-2"
            />
          </View>

          <View className="p-4 border-b border-gray-200">
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>

          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            className="flex-1 px-4"
            contentContainerStyle={{ paddingVertical: 16 }}
          />
        </ScrollView>

        <TouchableOpacity
          className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={() => {
            // TODO: Navigate to add product screen
          }}
        >
          <Icon name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 