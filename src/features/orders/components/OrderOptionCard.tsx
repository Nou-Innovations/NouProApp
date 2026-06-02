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
  icon: string;
  onPress: () => void;
  isActive?: boolean;
  badge?: number;
};

function OrderOptionCard({
  type,
  title,
  description,
  icon,
  onPress,
  isActive = false,
  badge,
}: OrderOptionCardProps) {
  // Returns a concrete color value (the Icon component takes a `color` prop,
  // not a NativeWind className).
  const getIconColor = () => {
    switch (type) {
      case 'assign':
        return '#0075FF'; // primary
      case 'payment':
        return '#059669'; // green
      case 'delivery':
        return '#5B21B6'; // purple
      case 'invoice':
        return '#F59E0B'; // amber
      case 'chat':
        return '#0EA5E9'; // sky
      case 'notes':
        return '#4B5563'; // gray-600
      case 'history':
        return '#6B7280'; // gray-500
      default:
        return '#6B7280';
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
            <Icon name={icon} size={20} color={getIconColor()} />
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
          <Icon name="chevron-right" size={20} color="#9CA3AF" />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(OrderOptionCard);