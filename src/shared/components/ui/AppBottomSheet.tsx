import React, { useEffect, useMemo, useRef, useState, useCallback, createContext, useContext } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, Dimensions, PanResponder } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewProps, FlatListProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { OVERLAY } from '@/shared/ui/tokens/overlays';
import ListItemCard, { ListItemCardAvatarProps } from './ListItemCard';
import AppButton from './AppButton';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 300;
// Fixed bottom padding for every sheet (replaces the device safe-area inset). Single source of
// truth — fullHeight children that set their own content paddingBottom should import this.
export const SHEET_BOTTOM_PADDING = 32;

// Lets children-mode sheets that render their OWN ScrollView/FlatList report their scroll
// offset to the sheet's swipe-to-close pan (which only closes when the list is at the top).
type SheetScrollProps = {
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
};
const AppBottomSheetScrollContext = createContext<SheetScrollProps | null>(null);

/**
 * Drop-in replacement for `ScrollView` inside an AppBottomSheet (children mode). It reports
 * its scroll offset to the sheet so swipe-down-to-close engages once it's scrolled to the top.
 * Defaults to `bounces={false}` (required for the gesture to win at the top). Outside a sheet
 * it behaves like a normal ScrollView.
 */
export function AppBottomSheetScrollView({ onScroll, ...rest }: ScrollViewProps) {
  const ctx = useContext(AppBottomSheetScrollContext);
  return (
    <ScrollView
      bounces={false}
      scrollEventThrottle={16}
      {...rest}
      onScroll={(e) => { ctx?.onScroll?.(e); onScroll?.(e); }}
    />
  );
}

/** FlatList counterpart of {@link AppBottomSheetScrollView}. */
export function AppBottomSheetFlatList<ItemT>({ onScroll, ...rest }: FlatListProps<ItemT>) {
  const ctx = useContext(AppBottomSheetScrollContext);
  return (
    <FlatList<ItemT>
      bounces={false}
      scrollEventThrottle={16}
      {...rest}
      onScroll={(e) => { ctx?.onScroll?.(e); onScroll?.(e); }}
    />
  );
}

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
  /** Optional description line shown under the title (e.g. for action-sheet menus). */
  subtitle?: string;

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
  subtitle,
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
  // Current vertical scroll offset of the sheet's list. The swipe-to-close pan only
  // engages when this is at the top (<= 0), so a long list scrolls normally and only
  // closes the sheet once scrolled back to the top. Written by the internal items-mode
  // ScrollView and (in children mode) by any child AppBottomSheetScrollView/FlatList.
  const scrollOffsetY = useRef(0);

  // Scroll props handed to children-mode scrollables through context.
  const childScrollProps = useMemo<SheetScrollProps>(
    () => ({
      scrollEventThrottle: 16,
      onScroll: (e) => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; },
    }),
    []
  );

  // Calculate max height for the sheet (screen height - top safe area - some margin from top)
  const maxSheetHeight = SCREEN_HEIGHT - insets.top - 20; // 20px margin from status bar
  
  // Pan responder for swipe-to-close. Spread on the whole sheet so a downward swipe
  // ANYWHERE closes it — not just on the drag handle. It is scroll-aware: it only
  // takes over for a downward, mostly-vertical drag while the internal list is at the
  // top (scrollOffsetY <= 0). When the list is scrolled down, the gesture is left to
  // the ScrollView (so the list scrolls); scroll back to the top and a further swipe
  // closes the sheet. `onStartShouldSetPanResponder` stays false so taps on list
  // items / buttons / the close button are never hijacked.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dy > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          scrollOffsetY.current <= 0
        );
      },
      // Once we own the gesture, don't let the ScrollView steal it back mid-drag.
      onPanResponderTerminationRequest: () => false,
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
      scrollOffsetY.current = 0; // reopened sheet starts "at top"
      
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
    // Bottom-sheet rows use a 40x40 picture box and the small checkbox.
    const avatar = item.avatar ? { ...item.avatar, size: 40 } : undefined;

    return (
      <ListItemCard
        key={item.id}
        avatar={avatar}
        title={item.title}
        subtitle={item.subtitle}
        onPress={() => handleItemPress(item)}
        disabled={item.disabled}
        showCheckmark={multiSelect || isSelected}
        selected={isSelected}
        compactCheckmark
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
        variant={isDestructive ? 'alert' : 'outline'}
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
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.cardBackground,
              borderTopColor: theme.colors.borderColor,
              transform: [{ translateY }],
              maxHeight: maxSheetHeight,
              // Don't add bottom padding when fullHeight - content handles its own scrolling
              paddingBottom: fullHeight ? 0 : SHEET_BOTTOM_PADDING,
              // When fullHeight is true, force the sheet to take full available height
              ...(fullHeight && { height: maxSheetHeight }),
            },
          ]}
        >
          {/* Fixed header section with drag handle (swipe-to-close works anywhere on the sheet) */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

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

          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.colors.textLight }]}>
              {subtitle}
            </Text>
          ) : null}

          {/* Content area */}
          {items ? (
            // Items mode: use ScrollView for list
            <ScrollView
              style={[styles.content, fullHeight && styles.contentFullHeight]}
              showsVerticalScrollIndicator={false}
              bounces={false}
              scrollEventThrottle={16}
              onScroll={(e) => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; }}
              contentContainerStyle={[
                styles.contentContainer, 
                fullHeight && styles.contentContainerFullHeight,
                fullHeight && { paddingBottom: SHEET_BOTTOM_PADDING }
              ]}
            >
              {renderListContent()}
            </ScrollView>
          ) : (
            // Children mode: children manage their own scrolling. The context lets a child
            // AppBottomSheetScrollView/FlatList report its offset so swipe-to-close works.
            <AppBottomSheetScrollContext.Provider value={childScrollProps}>
              <View style={[
                styles.content,
                fullHeight && styles.contentFullHeight,
              ]}>
                {children}
              </View>
            </AppBottomSheetScrollContext.Provider>
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
    fontSize: 20,
    fontFamily: 'InterCustom-Bold',
    flex: 1,
    paddingRight: 24,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
    lineHeight: 20,
    paddingHorizontal: 12,
    marginTop: -8,
    marginBottom: 12,
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
