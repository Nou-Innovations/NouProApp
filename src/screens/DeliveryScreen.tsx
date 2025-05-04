import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { orderService } from '../services/orders';
import OrderCard from '../components/OrderCard';
import { Feather as Icon } from '@expo/vector-icons';

type OrderStatus = 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';

export default function DeliveryScreen() {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const { orders, selectedLocation } = useStore();

  useEffect(() => {
    if (selectedLocation) {
      orderService.fetchOrders(selectedLocation.id);
    }
  }, [selectedLocation]);

  const filteredOrders = selectedStatus
    ? orderService.getOrdersByStatus(selectedStatus)
    : orders;

  const statuses: OrderStatus[] = ['pending', 'processing', 'in_transit', 'delivered', 'cancelled'];

  const getStatusColor = (status: OrderStatus) => {
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

  const renderStatusItem = ({ item }: { item: OrderStatus }) => (
    <TouchableOpacity
      onPress={() => setSelectedStatus(selectedStatus === item ? null : item)}
      className={`px-4 py-2 rounded-full mr-2 ${
        selectedStatus === item ? getStatusColor(item) : 'bg-gray-200'
      }`}
    >
      <Text
        className={`${
          selectedStatus === item ? 'text-white' : 'text-gray-700'
        }`}
      >
        {item.replace('_', ' ')}
      </Text>
    </TouchableOpacity>
  );

  const renderOrderItem = ({ item }) => (
    <OrderCard
      orderId={item.id}
      clientName={item.clientName}
      date={item.date}
      total={item.total}
      status={item.status}
      paymentStatus={item.paymentStatus}
      onPress={() => {
        // TODO: Navigate to order details
      }}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <View className="px-4 py-2 bg-card border-b border-gray-200">
          <Text className="text-xl font-bold">Delivery</Text>
        </View>
        
        {/* Location Selector */}
        <View className="p-4 border-b border-gray-200">
          <Text className="text-sm font-semibold text-gray-500 mb-2">Location</Text>
          {/* Location selector will go here */}
        </View>
        
        <View className="p-4 border-b border-gray-200">
          <FlatList
            data={statuses}
            renderItem={renderStatusItem}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>

        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
        />

        <TouchableOpacity
          className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={() => {
            // TODO: Navigate to create order screen
          }}
        >
          <Icon name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 