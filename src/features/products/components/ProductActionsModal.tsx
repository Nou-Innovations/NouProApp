import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface ProductActionsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedView: string;
  onSelectView: (view: string) => void;
}

const productViewItems = [
  {
    id: 'All Products',
    title: 'All Products',
    description: 'Show every brand and product available in the business',
    icon: 'store',
  },
  {
    id: 'My Products',
    title: 'My products',
    description: 'Show the brands and products created by your business',
    icon: 'box',
  },
  {
    id: 'Imported',
    title: 'Imported',
    description: "Show the brands and products you've ordered from other businesses",
    icon: 'download',
  },
  {
    id: 'Display',
    title: 'Display',
    description: 'Show only the brands and products that are visible to other businesses',
    icon: 'eye',
  },
];

export default function ProductActionsModal({
  visible,
  onClose,
  selectedView,
  onSelectView,
}: ProductActionsModalProps) {
  const { theme } = useTheme();

  const handleSelectItem = (id: string) => {
    onSelectView(id);
    onClose();
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Select view">
      <View style={styles.content}>
        {productViewItems.map((item) => {
          const isSelected = selectedView === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.selectionItem,
                isSelected 
                  ? { backgroundColor: theme.colors.selectedBackground } 
                  : { backgroundColor: theme.colors.cardBackground, borderWidth: 1, borderColor: theme.colors.borderColor },
              ]}
              onPress={() => handleSelectItem(item.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                isSelected 
                  ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } 
                  : { backgroundColor: theme.colors.surface },
              ]}>
                <Icon
                  name={item.icon}
                  size={24}
                  color={isSelected ? theme.colors.textInverse : theme.colors.text}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={[
                  styles.itemTitle,
                  { color: isSelected ? theme.colors.textInverse : theme.colors.text },
                ]}>
                  {item.title}
                </Text>
                <Text style={[
                  styles.itemDescription,
                  { color: isSelected ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary },
                ]}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    gap: 12,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
});
