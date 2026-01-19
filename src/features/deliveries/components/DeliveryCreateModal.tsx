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

export default function DeliveryCreateModal({
  visible,
  onClose,
  onCreateDelivery,
  onCreateTransfer,
}: DeliveryCreateModalProps) {
  const { theme } = useTheme();

  const handleActionPress = (action: 'delivery' | 'transfer') => {
    if (action === 'delivery') {
      onCreateDelivery();
    } else {
      onCreateTransfer();
    }
    onClose();
  };

  const actionItems = [
    { id: 'delivery', title: 'Create new Delivery' },
    { id: 'transfer', title: 'Create new Transfer' },
  ];

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Actions">
      <View style={styles.content}>
        {actionItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.actionButton, 
              { 
                backgroundColor: theme.colors.cardBackground, 
                borderColor: theme.colors.borderColor 
              }
            ]}
            onPress={() => handleActionPress(item.id as 'delivery' | 'transfer')}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 12,
    gap: 8,
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
