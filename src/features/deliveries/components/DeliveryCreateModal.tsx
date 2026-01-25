import React from 'react';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';

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
  const actionItems: AppBottomSheetItem[] = [
    { id: 'delivery', title: 'Create new Delivery' },
    { id: 'transfer', title: 'Create new Transfer' },
  ];

  const handleSelectItem = (item: AppBottomSheetItem) => {
    if (item.id === 'delivery') {
      onCreateDelivery();
    } else if (item.id === 'transfer') {
      onCreateTransfer();
    }
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Actions"
      items={actionItems}
      mode="buttons"
      onSelectItem={handleSelectItem}
    />
  );
}
