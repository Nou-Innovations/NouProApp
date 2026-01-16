import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { OVERLAY, MODAL_TYPOGRAPHY } from '@/shared/ui/tokens/overlays';
import ListItemCard, { ListItemCardAvatarProps } from './ListItemCard';

// ============================================================================
// TYPES
// ============================================================================

export interface AppBottomSheetItem {
  id: string;
  title: string;
  subtitle?: string;
  avatar?: ListItemCardAvatarProps;
  disabled?: boolean;
  /** 'destructive' renders with error color */
  variant?: 'default' | 'destructive';
}

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  
  // Children mode (original behavior)
  children?: React.ReactNode;
  
  // List mode (optional - if items provided, renders list using ListItemCard)
  items?: AppBottomSheetItem[];
  onSelectItem?: (item: AppBottomSheetItem) => void;
  
  // Single selection
  selectedItemId?: string;
  
  // Multi selection
  multiSelect?: boolean;
  selectedItemIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  
  // List customization
  maxHeight?: number;
  renderItem?: (item: AppBottomSheetItem, index: number) => React.ReactNode;
}

/**
 * AppBottomSheet
 * Use for lists/options/actions (create new, choose status, filters, etc.).
 * Slides up from the bottom with a drag handle and scrollable content.
 * 
 * Supports two modes:
 * 1. Children mode: Pass children prop for custom content
 * 2. List mode: Pass items prop for automatic list rendering with ListItemCard
 * 
 * This is the ONLY bottom sheet component to use. Replace:
 * - ActionBottomSheet → AppBottomSheet
 * - ModalList → AppBottomSheet
 * - DropdownModal → AppBottomSheet
 */
export default function AppBottomSheet({
  visible,
  onClose,
  title,
  children,
  items,
  onSelectItem,
  selectedItemId,
  multiSelect = false,
  selectedItemIds = [],
  onSelectionChange,
  maxHeight,
  renderItem,
}: AppBottomSheetProps) {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(20);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, translateY]);

  const overlayStyle = useMemo(
    () => [styles.overlay, { backgroundColor: OVERLAY.backdrop, opacity }],
    [opacity]
  );

  // Handle item press for list mode
  const handleItemPress = (item: AppBottomSheetItem) => {
    if (item.disabled) return;

    if (multiSelect) {
      const newSelection = selectedItemIds.includes(item.id)
        ? selectedItemIds.filter(id => id !== item.id)
        : [...selectedItemIds, item.id];
      onSelectionChange?.(newSelection);
    } else {
      onSelectItem?.(item);
      onClose();
    }
  };

  // Render default list item using ListItemCard
  const renderDefaultItem = (item: AppBottomSheetItem, index: number) => {
    const isSelected = multiSelect
      ? selectedItemIds.includes(item.id)
      : selectedItemId === item.id;
    const isLast = items ? index === items.length - 1 : false;
    const isDestructive = item.variant === 'destructive';

    return (
      <ListItemCard
        key={item.id}
        avatar={item.avatar}
        title={item.title}
        subtitle={item.subtitle}
        onPress={() => handleItemPress(item)}
        disabled={item.disabled}
        showCheckmark={multiSelect || isSelected}
        selected={isSelected}
        selectionVariant={isSelected ? 'highlight' : undefined}
        showDivider={!isLast}
        style={isDestructive ? { opacity: 0.9 } : undefined}
      />
    );
  };

  // Render list content
  const renderListContent = () => {
    if (!items || items.length === 0) return null;

    const listStyle = maxHeight ? { maxHeight } : undefined;

    return (
      <ScrollView 
        style={listStyle} 
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {items.map((item, index) =>
          renderItem ? renderItem(item, index) : renderDefaultItem(item, index)
        )}
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={overlayStyle}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.cardBackground,
              borderTopColor: theme.colors.borderColor,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />

          {(title || true) && (
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                {title ?? ''}
              </Text>
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.closeBtn} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={28} color={theme.colors.iconColor} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.content}>
            {/* Render items if provided, otherwise render children */}
            {items ? renderListContent() : children}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
  },
  backdrop: { 
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: OVERLAY.sheetRadius,
    borderTopRightRadius: OVERLAY.sheetRadius,
    paddingTop: 8,
    paddingHorizontal: 0, // Cards handle their own 12px padding
    paddingBottom: 0,
    borderTopWidth: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12, // Match card padding for title alignment
    paddingBottom: 8,
  },
  title: { 
    fontSize: MODAL_TYPOGRAPHY.title.fontSize, 
    fontFamily: MODAL_TYPOGRAPHY.title.fontFamily, 
    flex: 1, 
    paddingRight: 10,
  },
  closeBtn: { 
    width: 40, 
    height: 40, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  content: { 
    paddingTop: 0,
  },
});
