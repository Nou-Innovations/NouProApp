import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useStore } from '../store';
import { invoicesAPI } from '../services/api';
import { Feather as Icon } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'InvoiceDetails'>;

export default function InvoiceDetailsScreen({ route, navigation }: Props) {
  const { invoiceId } = route.params;
  const { invoices } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoice = invoices.find((inv) => inv.id === invoiceId);

  useEffect(() => {
    if (!invoice) {
      // Fetch invoice details if not in store
      fetchInvoiceDetails();
    }
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      await invoicesAPI.getInvoiceDetails(invoiceId);
    } catch (err) {
      setError(err.message || 'Failed to fetch invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Invoice #${invoice?.id} from ${invoice?.clientName}`,
        url: invoice?.pdfUrl, // This would be the URL to the PDF
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to share invoice');
    }
  };

  const handleMarkAsPaid = async () => {
    Alert.alert(
      'Mark as Paid',
      'Are you sure you want to mark this invoice as paid?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark as Paid',
          onPress: async () => {
            setLoading(true);
            try {
              await invoicesAPI.updateInvoiceStatus(invoiceId, 'paid');
              Alert.alert('Success', 'Invoice marked as paid');
            } catch (err) {
              setError(err.message || 'Failed to update invoice status');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Invoice',
      'Are you sure you want to cancel this invoice?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await invoicesAPI.updateInvoiceStatus(invoiceId, 'cancelled');
              Alert.alert('Success', 'Invoice cancelled');
            } catch (err) {
              setError(err.message || 'Failed to cancel invoice');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-error text-center mb-4">{error}</Text>
        <TouchableOpacity
          className="bg-primary px-4 py-2 rounded-lg"
          onPress={fetchInvoiceDetails}
        >
          <Text className="text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Invoice not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold">Invoice #{invoice.id}</Text>
            <Text className="text-gray-500">{invoice.clientName}</Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full ${
              invoice.status === 'paid'
                ? 'bg-success'
                : invoice.status === 'overdue'
                ? 'bg-error'
                : 'bg-primary'
            }`}
          >
            <Text className="text-white capitalize">{invoice.status}</Text>
          </View>
        </View>

        {/* Dates */}
        <View className="mb-6">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500">Issue Date</Text>
            <Text>{invoice.date}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-500">Due Date</Text>
            <Text>{invoice.dueDate}</Text>
          </View>
        </View>

        {/* Items */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-4">Items</Text>
          {invoice.items.map((item, index) => (
            <View
              key={index}
              className="flex-row justify-between items-center py-2 border-b border-gray-200"
            >
              <View className="flex-1">
                <Text className="font-medium">{item.description}</Text>
                <Text className="text-gray-500">
                  {item.quantity} x ${item.unitPrice}
                </Text>
              </View>
              <Text className="font-semibold">
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View className="mb-6 p-4 bg-gray-50 rounded-lg">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Subtotal</Text>
            <Text className="font-semibold">
              ${invoice.items
                .reduce(
                  (sum, item) => sum + item.quantity * item.unitPrice,
                  0
                )
                .toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Tax</Text>
            <Text className="font-semibold">
              ${invoice.items
                .reduce(
                  (sum, item) =>
                    sum +
                    (item.quantity * item.unitPrice * item.tax) / 100,
                  0
                )
                .toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between pt-2 border-t border-gray-200">
            <Text className="text-lg font-bold">Total</Text>
            <Text className="text-lg font-bold">${invoice.total}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-2">Notes</Text>
            <Text className="text-gray-600">{invoice.notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View className="space-y-4">
          <TouchableOpacity
            className="bg-primary p-4 rounded-lg flex-row items-center justify-center"
            onPress={handleShare}
          >
            <Icon name="share-2" size={20} color="white" className="mr-2" />
            <Text className="text-white font-semibold ml-2">Share Invoice</Text>
          </TouchableOpacity>

          {invoice.status === 'sent' && (
            <TouchableOpacity
              className="bg-success p-4 rounded-lg flex-row items-center justify-center"
              onPress={handleMarkAsPaid}
            >
              <Icon name="check" size={20} color="white" className="mr-2" />
              <Text className="text-white font-semibold ml-2">
                Mark as Paid
              </Text>
            </TouchableOpacity>
          )}

          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <TouchableOpacity
              className="bg-error p-4 rounded-lg flex-row items-center justify-center"
              onPress={handleCancel}
            >
              <Icon name="x" size={20} color="white" className="mr-2" />
              <Text className="text-white font-semibold ml-2">
                Cancel Invoice
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
} 