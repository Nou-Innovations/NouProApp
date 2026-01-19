import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import { useTheme } from '@/shared/theme/ThemeProvider';

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
  const { theme } = useTheme();

  const handleActionPress = (id: string) => {
    if (id === 'product') {
      onCreateProduct();
    } else if (id === 'brand') {
      onCreateBrand();
    } else if (id === 'edit') {
      onEditMode();
    }
    onClose();
  };

  const actionItems = [
    {
      id: 'product',
      title: 'Create new Product',
    },
    {
      id: 'brand',
      title: 'Create new Brand',
    },
    ...(showEditMode ? [{
      id: 'edit',
      title: 'Edit Mode',
    }] : []),
  ];

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Actions">
      <View style={styles.content}>
        {actionItems.map((item) => (
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
