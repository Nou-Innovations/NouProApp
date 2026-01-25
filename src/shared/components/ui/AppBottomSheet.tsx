import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { OVERLAY, MODAL_TYPOGRAPHY } from '@/shared/ui/tokens/overlays';
import ListItemCard, { ListItemCardAvatarProps } from './ListItemCard';
import AppButton from './AppButton';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 300;

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
  
  // Display mode for items: 'list' uses ListItemCard, 'buttons' uses AppButton outline
  mode?: 'list' | 'buttons';
  
  // Single selection
  selectedItemId?: string;
  
  // Multi selection
  multiSelect?: boolean;
  selectedItemIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  
  // List customization
  maxHeight?: number;
  renderItem?: (item: AppBottomSheetItem, index: number) => React.ReactNode;
  
  // Full height mode - makes the modal stick to the screen header
  fullHeight?: boolean;
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
  mode = 'list',
  selectedItemId,
  multiSelect = false,
  selectedItemIds = [],
  onSelectionChange,
  maxHeight,
  renderItem,
  fullHeight = false,
}: AppBottomSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);
  const dragY = useRef(0);
  
  // Calculate max height for the sheet (screen height - top safe area - some margin from top)
  const maxSheetHeight = SCREEN_HEIGHT - insets.top - 20; // 20px margin from status bar
  
  // Pan responder for drag-to-close gesture on handle
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        dragY.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down
        if (gestureState.dy > 0) {
          dragY.current = gestureState.dy;
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If dragged more than 100px or with velocity, close the sheet
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          // Snap back to open position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  // Handle opening animation
  useEffect(() => {
    if (visible && !modalVisible) {
      // Show modal first, then animate
      setModalVisible(true);
      translateY.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);
      
      // Small delay to ensure modal is rendered before animating
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(overlayOpacity, { 
            toValue: 1, 
            duration: ANIMATION_DURATION, 
            useNativeDriver: true 
          }),
          Animated.timing(translateY, { 
            toValue: 0, 
            duration: ANIMATION_DURATION, 
            useNativeDriver: true 
          }),
        ]).start();
      });
    }
  }, [visible, modalVisible, translateY, overlayOpacity]);

  // Handle closing animation
  const handleClose = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    Animated.parallel([
      Animated.timing(overlayOpacity, { 
        toValue: 0, 
        duration: ANIMATION_DURATION, 
        useNativeDriver: true 
      }),
      Animated.timing(translateY, { 
        toValue: SCREEN_HEIGHT, 
        duration: ANIMATION_DURATION, 
        useNativeDriver: true 
      }),
    ]).start(() => {
      setModalVisible(false);
      isClosing.current = false;
      onClose();
    });
  }, [onClose, overlayOpacity, translateY]);

  // Handle external visibility change (when parent sets visible to false)
  useEffect(() => {
    if (!visible && modalVisible && !isClosing.current) {
      handleClose();
    }
  }, [visible, modalVisible, handleClose]);

  const overlayStyle = useMemo(
    () => [styles.overlay, { backgroundColor: OVERLAY.backdrop, opacity: overlayOpacity }],
    [overlayOpacity]
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
      handleClose();
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

  // Render button item using AppButton
  const renderButtonItem = (item: AppBottomSheetItem) => {
    const isDestructive = item.variant === 'destructive';

    return (
      <AppButton
        key={item.id}
        title={item.title}
        onPress={() => handleItemPress(item)}
        disabled={item.disabled}
        variant={isDestructive ? 'danger' : 'outline'}
      />
    );
  };

  // Render list content (items only, ScrollView is handled by parent)
  const renderListContent = () => {
    if (!items || items.length === 0) return null;

    // Buttons mode: render as AppButton with outline variant
    if (mode === 'buttons') {
      return (
        <View style={styles.buttonsContainer}>
          {items.map((item) => renderButtonItem(item))}
        </View>
      );
    }

    // List mode: render as ListItemCard
    return (
      <>
        {items.map((item, index) =>
          renderItem ? renderItem(item, index) : renderDefaultItem(item, index)
        )}
      </>
    );
  };

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={overlayStyle}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.cardBackground,
              borderTopColor: theme.colors.borderColor,
              transform: [{ translateY }],
              maxHeight: maxSheetHeight,
              // Don't add bottom padding when fullHeight - content handles its own scrolling
              paddingBottom: fullHeight ? 0 : insets.bottom,
              // When fullHeight is true, force the sheet to take full available height
              ...(fullHeight && { height: maxSheetHeight }),
            },
          ]}
        >
          {/* Fixed header section with drag handle */}
          <Animated.View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View style={styles.handle} />
          </Animated.View>

          {(title || true) && (
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                {title ?? ''}
              </Text>
              <TouchableOpacity 
                onPress={handleClose} 
                style={styles.closeBtn} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={28} color={theme.colors.iconColor} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}

          {/* Content area */}
          {items ? (
            // Items mode: use ScrollView for list
            <ScrollView 
              style={[styles.content, fullHeight && styles.contentFullHeight]}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={[
                styles.contentContainer, 
                fullHeight && styles.contentContainerFullHeight,
                fullHeight && { paddingBottom: insets.bottom + 20 }
              ]}
            >
              {renderListContent()}
            </ScrollView>
          ) : (
            // Children mode: children manage their own scrolling
            <View style={[
              styles.content, 
              fullHeight && styles.contentFullHeight,
              fullHeight && { paddingBottom: insets.bottom }
            ]}>
              {children}
            </View>
          )}
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
    paddingTop: 0,
    paddingHorizontal: 0, // Cards handle their own 12px padding
    paddingBottom: 0,
    borderTopWidth: 1,
    // Allow sheet to shrink to content size
    flexShrink: 1,
  },
  handleContainer: {
    paddingTop: 8,
    paddingBottom: 0,
    alignItems: 'center',
  },
  handle: {
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
    paddingBottom: 16,
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
    // Allow content to scroll when sheet reaches max height
    flexShrink: 1,
  },
  contentFullHeight: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 0,
  },
  contentContainerFullHeight: {
    flexGrow: 1,
  },
  buttonsContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
});
