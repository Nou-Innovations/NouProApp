import React from 'react';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';

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
  const actionItems: AppBottomSheetItem[] = [
    { id: 'invoice', title: 'Create New Invoice' },
    { id: 'estimate', title: 'Create New Estimate' },
  ];

  const handleSelectItem = (item: AppBottomSheetItem) => {
    if (item.id === 'invoice') {
      onCreateInvoice();
    } else if (item.id === 'estimate') {
      onCreateEstimate();
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
