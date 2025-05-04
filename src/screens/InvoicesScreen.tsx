import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useStore } from '../store';
import { invoicesAPI } from '../services/api';
import InvoiceCard from '../components/InvoiceCard';
import { Feather as Icon } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TabParamList } from '../types/navigation';

type Props = NativeStackScreenProps<TabParamList, 'Invoices'>;

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export default function InvoicesScreen({ navigation }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | null>(null);
  const { invoices, selectedLocation } = useStore();

  useEffect(() => {
    if (selectedLocation) {
      invoicesAPI.getInvoices(selectedLocation.id);
    }
  }, [selectedLocation]);

  const filteredInvoices = selectedStatus
    ? invoices.filter(invoice => invoice.status === selectedStatus)
    : invoices;

  const statuses: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

  const getStatusColor = (status: InvoiceStatus) => {
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

  const renderStatusItem = ({ item }: { item: InvoiceStatus }) => (
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
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderInvoiceItem = ({ item }) => (
    <InvoiceCard
      invoiceId={item.id}
      clientName={item.clientName}
      date={item.date}
      dueDate={item.dueDate}
      total={item.total}
      status={item.status}
      onPress={() => {
        navigation.navigate('InvoiceDetails', { invoiceId: item.id });
      }}
    />
  );

  return (
    <View className="flex-1 bg-white">
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
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16 }}
      />

      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => {
          navigation.navigate('CreateInvoice');
        }}
      >
        <Icon name="plus" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
} 