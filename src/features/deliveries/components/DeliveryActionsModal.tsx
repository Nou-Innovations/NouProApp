import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { DeliveryViewType } from '@/shared/types/delivery';

export type { DeliveryViewType };

interface DeliveryActionsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedView: DeliveryViewType;
  onSelectView: (view: DeliveryViewType) => void;
}

const deliveryViewItems = [
  {
    id: 'all' as const,
    title: 'All',
    description: 'Show all deliveries and transfers.',
    icon: 'grid',
  },
  {
    id: 'outgoing' as const,
    title: 'Outgoing',
    description: 'Show all outgoing deliveries and transfers.',
    icon: 'arrow-up-circle',
  },
  {
    id: 'incoming' as const,
    title: 'Incoming',
    description: 'Show all incoming deliveries and transfers.',
    icon: 'arrow-down-circle',
  },
  {
    id: 'transfers' as const,
    title: 'Transfers',
    description: 'Show transfers between same business locations.',
    icon: 'arrow-right-left',
  },
];

export default function DeliveryActionsModal({
  visible,
  onClose,
  selectedView,
  onSelectView,
}: DeliveryActionsModalProps) {
  const { theme } = useTheme();

  const handleSelectItem = (id: DeliveryViewType) => {
    onSelectView(id);
    onClose();
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Select view">
      <View style={styles.content}>
        {deliveryViewItems.map((item) => {
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
