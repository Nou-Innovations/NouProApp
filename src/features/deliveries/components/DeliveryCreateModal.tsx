import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import AppButton from '@/shared/components/ui/AppButton';

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
  const handleCreateDelivery = () => {
    onCreateDelivery();
    onClose();
  };

  const handleCreateTransfer = () => {
    onCreateTransfer();
    onClose();
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Actions">
      <View style={styles.content}>
        <AppButton
          title="Create a new Delivery"
          onPress={handleCreateDelivery}
          variant="outline"
        />
        <AppButton
          title="Create a new Transfer"
          onPress={handleCreateTransfer}
          variant="outline"
        />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 12,
    paddingBottom: 40,
    gap: 8,
  },
});
