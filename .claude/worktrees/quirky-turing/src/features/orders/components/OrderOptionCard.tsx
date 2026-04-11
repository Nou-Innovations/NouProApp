import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';

type OrderOptionType = 
  | 'assign'
  | 'payment'
  | 'delivery'
  | 'invoice'
  | 'chat'
  | 'notes'
  | 'history';

type OrderOptionCardProps = {
  type: OrderOptionType;
  title: string;
  description: string;
  icon: keyof typeof Icon.glyphMap;
  onPress: () => void;
  isActive?: boolean;
  badge?: number;
};

export default function OrderOptionCard({
  type,
  title,
  description,
  icon,
  onPress,
  isActive = false,
  badge,
}: OrderOptionCardProps) {
  const getIconColor = () => {
    switch (type) {
      case 'assign':
        return 'text-primary';
      case 'payment':
        return 'text-success';
      case 'delivery':
        return 'text-secondary';
      case 'invoice':
        return 'text-warning';
      case 'chat':
        return 'text-info';
      case 'notes':
        return 'text-gray-600';
      case 'history':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getBackgroundColor = () => {
    if (isActive) {
      switch (type) {
        case 'assign':
          return 'bg-primary/10';
        case 'payment':
          return 'bg-success/10';
        case 'delivery':
          return 'bg-secondary/10';
        case 'invoice':
          return 'bg-warning/10';
        case 'chat':
          return 'bg-info/10';
        case 'notes':
          return 'bg-gray-100';
        case 'history':
          return 'bg-gray-100';
        default:
          return 'bg-gray-100';
      }
    }
    return 'bg-white';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${getBackgroundColor()} rounded-lg p-4 mb-2 border border-gray-200`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className={`w-10 h-10 rounded-full ${getBackgroundColor()} items-center justify-center mr-3`}>
            <Icon name={icon} size={20} className={getIconColor()} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">{title}</Text>
            <Text className="text-sm text-gray-500">{description}</Text>
          </View>
        </View>
        {badge ? (
          <View className="bg-primary rounded-full px-2 py-1 min-w-[24px] items-center justify-center">
            <Text className="text-xs text-white font-medium">{badge}</Text>
          </View>
        ) : (
          <Icon name="chevron-right" size={20} className="text-gray-400" />
        )}
      </View>
    </TouchableOpacity>
  );
} 