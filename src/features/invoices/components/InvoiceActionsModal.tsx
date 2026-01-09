import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface InvoiceActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateInvoice: () => void;
  onCreateEstimate: () => void;
}

const invoiceActionItems = [
  {
    id: 'invoice',
    title: 'Create New Invoice',
  },
  {
    id: 'estimate',
    title: 'Create New Estimate',
  },
];

export default function InvoiceActionsModal({
  visible,
  onClose,
  onCreateInvoice,
  onCreateEstimate,
}: InvoiceActionsModalProps) {
  const { theme } = useTheme();

  const handleActionPress = (id: string) => {
    if (id === 'invoice') {
      onCreateInvoice();
    } else if (id === 'estimate') {
      onCreateEstimate();
    }
    onClose();
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Actions">
      <View style={styles.content}>
        {invoiceActionItems.map((item) => (
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
