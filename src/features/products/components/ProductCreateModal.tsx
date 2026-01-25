import React from 'react';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';

interface ProductCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateProduct: () => void;
  onCreateBrand: () => void;
  onEditMode: () => void;
  showEditMode?: boolean;
}

export default function ProductCreateModal({
  visible,
  onClose,
  onCreateProduct,
  onCreateBrand,
  onEditMode,
  showEditMode = true,
}: ProductCreateModalProps) {
  const actionItems: AppBottomSheetItem[] = [
    { id: 'product', title: 'Create new Product' },
    { id: 'brand', title: 'Create new Brand' },
    ...(showEditMode ? [{ id: 'edit', title: 'Edit Mode' }] : []),
  ];

  const handleSelectItem = (item: AppBottomSheetItem) => {
    if (item.id === 'product') {
      onCreateProduct();
    } else if (item.id === 'brand') {
      onCreateBrand();
    } else if (item.id === 'edit') {
      onEditMode();
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
