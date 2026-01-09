import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface DeliveryCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateDelivery: () => void;
  onCreateTransfer: () => void;
}

const deliveryCreateItems = [
  {
    id: 'delivery',
    title: 'Create a new Delivery',
  },
  {
    id: 'transfer',
    title: 'Create a new Transfer',
  },
];

export default function DeliveryCreateModal({
  visible,
  onClose,
  onCreateDelivery,
  onCreateTransfer,
}: DeliveryCreateModalProps) {
  const { theme } = useTheme();

  const handleActionPress = (id: string) => {
    if (id === 'delivery') {
      onCreateDelivery();
    } else if (id === 'transfer') {
      onCreateTransfer();
    }
    onClose();
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Actions">
      <View style={styles.content}>
        {deliveryCreateItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.actionButton, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderColor }]}
            onPress={() => handleActionPress(item.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
