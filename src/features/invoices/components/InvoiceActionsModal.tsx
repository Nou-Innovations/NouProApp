import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import AppButton from '@/shared/components/ui/AppButton';

interface InvoiceActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateInvoice: () => void;
  onCreateEstimate: () => void;
}

export default function InvoiceActionsModal({
  visible,
  onClose,
  onCreateInvoice,
  onCreateEstimate,
}: InvoiceActionsModalProps) {
  const handleCreateInvoice = () => {
    onCreateInvoice();
    onClose();
  };

  const handleCreateEstimate = () => {
    onCreateEstimate();
    onClose();
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Actions">
      <View style={styles.content}>
        <AppButton
          title="Create New Invoice"
          onPress={handleCreateInvoice}
          variant="outline"
        />
        <AppButton
          title="Create New Estimate"
          onPress={handleCreateEstimate}
          variant="outline"
        />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 12,
    gap: 8,
  },
});
