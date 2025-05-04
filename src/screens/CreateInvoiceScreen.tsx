import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useStore } from '../store';
import { invoicesAPI } from '../services/api';
import { Feather as Icon } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateInvoice'>;

export default function CreateInvoiceScreen({ navigation }: Props) {
  const { selectedLocation, clients } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState([
    { description: '', quantity: '', unitPrice: '', tax: '' },
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedLocation) {
      // Fetch clients for the selected location
      // This would be implemented in the store
    }
  }, [selectedLocation]);

  const addItem = () => {
    setItems([
      ...items,
      { description: '', quantity: '', unitPrice: '', tax: '' },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
  };

  const calculateTax = () => {
    return items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const taxRate = parseFloat(item.tax) || 0;
      return sum + (quantity * unitPrice * taxRate) / 100;
    }, 0);
  };

  const handleCreateInvoice = async () => {
    if (!clientId) {
      setError('Please select a client');
      return;
    }

    if (!dueDate) {
      setError('Please set a due date');
      return;
    }

    const invalidItems = items.some(
      item =>
        !item.description ||
        !item.quantity ||
        !item.unitPrice ||
        !item.tax
    );

    if (invalidItems) {
      setError('Please fill in all item fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const invoiceData = {
        clientId,
        dueDate,
        items: items.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          tax: parseFloat(item.tax),
        })),
        notes,
        locationId: selectedLocation?.id,
      };

      await invoicesAPI.createInvoice(invoiceData);
      Alert.alert('Success', 'Invoice created successfully');
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-6">Create Invoice</Text>

        {/* Client Selection */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 mb-2">
            Client
          </Text>
          <View className="border border-gray-300 rounded-lg p-3">
            <Text className="text-gray-700">
              {clients.find(c => c.id === clientId)?.name || 'Select a client'}
            </Text>
          </View>
        </View>

        {/* Due Date */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 mb-2">
            Due Date
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3"
            placeholder="YYYY-MM-DD"
            value={dueDate}
            onChangeText={setDueDate}
          />
        </View>

        {/* Items */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-gray-500">Items</Text>
            <TouchableOpacity
              onPress={addItem}
              className="bg-primary px-3 py-1 rounded-full"
            >
              <Text className="text-white">Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-semibold">Item {index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeItem(index)}
                    className="text-error"
                  >
                    <Icon name="trash-2" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-2"
                placeholder="Description"
                value={item.description}
                onChangeText={(value) => updateItem(index, 'description', value)}
              />

              <View className="flex-row space-x-2">
                <TextInput
                  className="flex-1 border border-gray-300 rounded-lg p-3"
                  placeholder="Quantity"
                  keyboardType="numeric"
                  value={item.quantity}
                  onChangeText={(value) => updateItem(index, 'quantity', value)}
                />
                <TextInput
                  className="flex-1 border border-gray-300 rounded-lg p-3"
                  placeholder="Unit Price"
                  keyboardType="numeric"
                  value={item.unitPrice}
                  onChangeText={(value) => updateItem(index, 'unitPrice', value)}
                />
                <TextInput
                  className="flex-1 border border-gray-300 rounded-lg p-3"
                  placeholder="Tax %"
                  keyboardType="numeric"
                  value={item.tax}
                  onChangeText={(value) => updateItem(index, 'tax', value)}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Notes */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 mb-2">
            Notes
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 h-24"
            placeholder="Add any additional notes..."
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Totals */}
        <View className="mb-6 p-4 bg-gray-50 rounded-lg">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Subtotal</Text>
            <Text className="font-semibold">
              ${calculateSubtotal().toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Tax</Text>
            <Text className="font-semibold">
              ${calculateTax().toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between pt-2 border-t border-gray-200">
            <Text className="text-lg font-bold">Total</Text>
            <Text className="text-lg font-bold">
              ${(calculateSubtotal() + calculateTax()).toFixed(2)}
            </Text>
          </View>
        </View>

        {error && (
          <Text className="text-error mb-4 text-center">{error}</Text>
        )}

        <TouchableOpacity
          className={`bg-primary p-4 rounded-lg ${
            loading ? 'opacity-50' : ''
          }`}
          onPress={handleCreateInvoice}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold">
              Create Invoice
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
} 