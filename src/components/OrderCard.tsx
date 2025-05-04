import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icon } from '@expo/vector-icons';

type OrderCardProps = {
  orderId: string;
  clientName: string;
  date: string;
  total: number;
  status: 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid';
  onPress: () => void;
};

export default function OrderCard({
  orderId,
  clientName,
  date,
  total,
  status,
  paymentStatus,
  onPress,
}: OrderCardProps) {
  const getStatusColor = (status: OrderCardProps['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-warning';
      case 'processing':
        return 'bg-primary';
      case 'in_transit':
        return 'bg-secondary';
      case 'delivered':
        return 'bg-success';
      case 'cancelled':
        return 'bg-error';
      default:
        return 'bg-gray-500';
    }
  };

  const getPaymentStatusColor = (status: OrderCardProps['paymentStatus']) => {
    switch (status) {
      case 'pending':
        return 'bg-error';
      case 'partial':
        return 'bg-warning';
      case 'paid':
        return 'bg-success';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-card rounded-lg shadow-sm mb-4 p-4"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="text-sm text-gray-500">Order #{orderId}</Text>
          <Text className="text-lg font-bold text-gray-900">{clientName}</Text>
        </View>
        <Text className="text-xl font-bold text-primary">${total.toFixed(2)}</Text>
      </View>

      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-gray-500">{date}</Text>
        <View className="flex-row space-x-2">
          <View className={`px-2 py-1 rounded-full ${getStatusColor(status)}`}>
            <Text className="text-xs text-white font-medium capitalize">
              {status.replace('_', ' ')}
            </Text>
          </View>
          <View className={`px-2 py-1 rounded-full ${getPaymentStatusColor(paymentStatus)}`}>
            <Text className="text-xs text-white font-medium capitalize">
              {paymentStatus}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row justify-end space-x-2">
        <TouchableOpacity className="bg-primary px-4 py-2 rounded-full">
          <Text className="text-white font-medium">Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-secondary px-4 py-2 rounded-full">
          <Text className="text-white font-medium">Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
} 