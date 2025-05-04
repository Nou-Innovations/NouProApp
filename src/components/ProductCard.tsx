import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Icon } from '@expo/vector-icons';

type ProductCardProps = {
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'in_production' | 'discontinued';
  onPress: () => void;
};

export default function ProductCard({
  name,
  brand,
  price,
  imageUrl,
  stockStatus,
  onPress,
}: ProductCardProps) {
  const getStatusColor = (status: ProductCardProps['stockStatus']) => {
    switch (status) {
      case 'in_stock':
        return 'bg-success';
      case 'low_stock':
        return 'bg-warning';
      case 'out_of_stock':
        return 'bg-error';
      case 'in_production':
        return 'bg-primary';
      case 'discontinued':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: ProductCardProps['stockStatus']) => {
    switch (status) {
      case 'in_stock':
        return 'In Stock';
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      case 'in_production':
        return 'In Production';
      case 'discontinued':
        return 'Discontinued';
      default:
        return 'Unknown';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-card rounded-lg shadow-sm mb-4 overflow-hidden"
    >
      <Image
        source={{ uri: imageUrl }}
        className="w-full h-48"
        resizeMode="cover"
      />
      <View className="p-4">
        <Text className="text-lg font-bold text-gray-900">{name}</Text>
        <Text className="text-sm text-gray-500 mb-2">{brand}</Text>
        
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold text-primary">${price.toFixed(2)}</Text>
          <View className={`px-2 py-1 rounded-full ${getStatusColor(stockStatus)}`}>
            <Text className="text-xs text-white font-medium">
              {getStatusText(stockStatus)}
            </Text>
          </View>
        </View>
        
        <View className="flex-row justify-end mt-2">
          <TouchableOpacity className="bg-primary px-4 py-2 rounded-full">
            <Text className="text-white font-medium">Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
} 