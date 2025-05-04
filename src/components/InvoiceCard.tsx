import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icon } from '@expo/vector-icons';

type InvoiceCardProps = {
  invoiceId: string;
  clientName: string;
  date: string;
  dueDate: string;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  onPress: () => void;
};

export default function InvoiceCard({
  invoiceId,
  clientName,
  date,
  dueDate,
  total,
  status,
  onPress,
}: InvoiceCardProps) {
  const getStatusColor = (status: InvoiceCardProps['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500';
      case 'sent':
        return 'bg-primary';
      case 'paid':
        return 'bg-success';
      case 'overdue':
        return 'bg-error';
      case 'cancelled':
        return 'bg-gray-400';
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
          <Text className="text-sm text-gray-500">Invoice #{invoiceId}</Text>
          <Text className="text-lg font-bold text-gray-900">{clientName}</Text>
        </View>
        <Text className="text-xl font-bold text-primary">${total.toFixed(2)}</Text>
      </View>

      <View className="flex-row justify-between items-center mb-2">
        <View>
          <Text className="text-sm text-gray-500">Issued: {date}</Text>
          <Text className="text-sm text-gray-500">Due: {dueDate}</Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${getStatusColor(status)}`}>
          <Text className="text-xs text-white font-medium capitalize">
            {status}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-end space-x-2">
        <TouchableOpacity className="bg-primary px-4 py-2 rounded-full">
          <Text className="text-white font-medium">View PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-secondary px-4 py-2 rounded-full">
          <Text className="text-white font-medium">Share</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
} 