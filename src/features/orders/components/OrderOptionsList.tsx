import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import OrderOptionCard from './OrderOptionCard';
import { Order } from '@/shared/types/store';

type OrderOptionsListProps = {
  order: Order;
  onOptionPress: (type: string) => void;
  unreadMessages?: number;
  hasNewNotes?: boolean;
};

export default function OrderOptionsList({
  order,
  onOptionPress,
  unreadMessages = 0,
  hasNewNotes = false,
}: OrderOptionsListProps) {
  const options = [
    {
      type: 'assign' as const,
      title: 'Assign Order',
      description: 'Assign this order to a staff member',
      icon: 'user-plus',
      isActive: !order.assignedTo,
    },
    {
      type: 'payment' as const,
      title: 'Payment Details',
      description: `Status: ${order.paymentStatus}`,
      icon: 'credit-card',
      isActive: order.paymentStatus === 'pending',
    },
    {
      type: 'delivery' as const,
      title: 'Delivery Details',
      description: order.transportMethod || 'No transport method selected',
      icon: 'truck',
      isActive: order.status === 'pending' || order.status === 'processing',
    },
    {
      type: 'invoice' as const,
      title: 'View Invoice',
      description: 'View and manage order invoice',
      icon: 'file-text',
      isActive: order.paymentStatus === 'paid',
    },
    {
      type: 'chat' as const,
      title: 'Chat',
      description: 'Communicate with the client',
      icon: 'message-circle',
      badge: unreadMessages,
    },
    {
      type: 'notes' as const,
      title: 'Order Notes',
      description: 'Add or view order notes',
      icon: 'clipboard',
      isActive: hasNewNotes,
    },
    {
      type: 'history' as const,
      title: 'Order History',
      description: 'View order status history',
      icon: 'clock',
    },
  ];

  return (
    <View className="flex-1">
      <Text className="text-lg font-bold text-gray-900 mb-4 px-4">Order Options</Text>
      <ScrollView className="flex-1 px-4">
        {options.map((option) => (
          <OrderOptionCard
            key={option.type}
            type={option.type}
            title={option.title}
            description={option.description}
            icon={option.icon}
            onPress={() => onOptionPress(option.type)}
            isActive={option.isActive}
            badge={option.badge}
          />
        ))}
      </ScrollView>
    </View>
  );
} 