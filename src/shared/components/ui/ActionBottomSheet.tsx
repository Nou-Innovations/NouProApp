import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface SelectionItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Icon.glyphMap;
}

export interface ActionItem {
  id: string;
  title: string;
}

interface ActionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  // For selection-style items (like Deliveries and Products)
  selectionItems?: SelectionItem[];
  selectedItemId?: string;
  onSelectItem?: (item: SelectionItem) => void;
  // For action-style buttons (like Invoices)
  actionItems?: ActionItem[];
  onActionPress?: (item: ActionItem) => void;
  // Optional styling
  containerStyle?: ViewStyle;
}

export default function ActionBottomSheet({
  visible,
  onClose,
  title,
  selectionItems,
  selectedItemId,
  onSelectItem,
  actionItems,
  onActionPress,
  containerStyle,
}: ActionBottomSheetProps) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      // Reset animation values
      overlayOpacity.setValue(0);
      contentTranslateY.setValue(SCREEN_HEIGHT);
      
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
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSelectItem = (item: SelectionItem) => {
    onSelectItem?.(item);
    handleClose();
  };

  const handleActionPress = (item: ActionItem) => {
    onActionPress?.(item);
    handleClose();
  };

  const renderSelectionItem = (item: SelectionItem) => {
    const isSelected = selectedItemId === item.id;
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.selectionItem,
          isSelected 
            ? { backgroundColor: appTheme.colors.selectedBackground } 
            : { backgroundColor: appTheme.colors.cardBackground, borderWidth: 1, borderColor: appTheme.colors.borderColor },
        ]}
        onPress={() => handleSelectItem(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconContainer,
          isSelected 
            ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } 
            : { backgroundColor: appTheme.colors.surface },
        ]}>
          <Icon
            name={item.icon}
            size={theme.iconSizes.md}
            color={isSelected ? appTheme.colors.textInverse : appTheme.colors.text}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[
            styles.itemTitle,
            { color: isSelected ? appTheme.colors.textInverse : appTheme.colors.text },
          ]}>
            {item.title}
          </Text>
          <Text style={[
            styles.itemDescription,
            { color: isSelected ? 'rgba(255, 255, 255, 0.7)' : appTheme.colors.textSecondary },
          ]}>
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderActionItem = (item: ActionItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.actionButton, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}
        onPress={() => handleActionPress(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.actionButtonText, { color: appTheme.colors.text }]}>{item.title}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      animationType="none"
    >
      <Animated.View
        style={[
          styles.modalContainer,
          { opacity: overlayOpacity },
        ]}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <Animated.View
          style={[
            styles.modalContent,
            {
              paddingBottom: insets.bottom + theme.spacing.md,
              transform: [{ translateY: contentTranslateY }],
              backgroundColor: appTheme.colors.cardBackground,
            },
            containerStyle,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: appTheme.colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={theme.iconSizes.md} color={appTheme.colors.iconMuted} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <View style={styles.content}>
            {/* Selection Items */}
            {selectionItems && selectionItems.map(renderSelectionItem)}
            
            {/* Action Items */}
            {actionItems && actionItems.map(renderActionItem)}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.medium,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    gap: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.sm,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg - 4,
  },
  iconContainer: {
    width: theme.heights.iconButton,
    height: theme.heights.iconButton,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm + 4,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: theme.spacing.xs,
  },
  itemDescription: {
    fontSize: theme.fontSize.sm,
    lineHeight: theme.lineHeight.sm,
    fontFamily: theme.fonts.primary.regular,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg - 4,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
  },
});

