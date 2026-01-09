import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';

export interface DropdownItem {
  id: string;
  title: string;
  description?: string;
  icon?: keyof typeof Icon.glyphMap;
}

interface DropdownModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: DropdownItem[];
  selectedItemId: string;
  onSelectItem: (item: DropdownItem) => void;
}

export default function DropdownModal({
  visible,
  onClose,
  title,
  items,
  selectedItemId,
  onSelectItem,
}: DropdownModalProps) {
  const { theme: appTheme } = useTheme();
  
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      // Reset animation values to starting position
      overlayOpacity.setValue(0);
      contentTranslateY.setValue(300);
      
      // Animate in
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSelectItem = (item: DropdownItem) => {
    onSelectItem(item);
    handleClose();
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      animationType="none"
    >
      <Animated.View style={[styles.modalContainer, { opacity: overlayOpacity }]}>
        <TouchableOpacity 
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View style={[styles.modalContent, { transform: [{ translateY: contentTranslateY }], opacity: 1 }]}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={theme.iconSizes.md} color={appTheme.colors.iconMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {items.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.modalItem}
                  onPress={() => handleSelectItem(item)}
                >
                  <View style={styles.modalItemIconContainer}>
                    <Icon 
                      name={item.icon || 'grid-outline'} 
                      size={theme.iconSizes.md} 
                      color={selectedItemId === item.id ? appTheme.colors.primary : appTheme.colors.iconMuted} 
                    />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={[
                      styles.modalItemName,
                      selectedItemId === item.id && { color: appTheme.colors.primary }
                    ]}>
                      {item.title}
                    </Text>
                    {item.description && (
                      <Text style={styles.modalItemDetails}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  {selectedItemId === item.id && (
                    <Icon name="checkmark" size={20} color={appTheme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingBottom: theme.spacing.xxl - 8,
    paddingHorizontal: 0,
    paddingTop: theme.spacing.md,
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  modalTitle: {
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.primary.medium,
    color: theme.colors.textHeading,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderColor,
  },
  modalItemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.inputBackgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    color: theme.colors.textHeading,
    marginBottom: 2,
  },
  modalItemDetails: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    color: theme.colors.textSubtle,
  },
}); 