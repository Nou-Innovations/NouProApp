import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  ScrollView,
  TextInput,
  ViewStyle,
  TextStyle,
  Dimensions,
  Image,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base interface for all list items
export interface ModalListItem {
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  icon?: keyof typeof Icon.glyphMap;
  iconColor?: string;
  backgroundColor?: string;
  isSelected?: boolean;
  disabled?: boolean;
  [key: string]: any; // Allow additional properties
}

interface ModalListProps {
  // Modal behavior
  visible: boolean;
  onClose: () => void;
  title: string;
  
  // List data and behavior
  items: ModalListItem[];
  onSelectItem: (item: ModalListItem) => void;
  
  // Search functionality
  hasSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  
  // Selection behavior
  multiSelect?: boolean;
  selectedItems?: string[]; // Array of item IDs
  onSelectionChange?: (selectedIds: string[]) => void;
  
  // Customization
  maxHeight?: number;
  renderItem?: (item: ModalListItem, index: number) => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;
  
  // Additional buttons/actions
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  
  // Styling
  containerStyle?: ViewStyle;
  itemStyle?: ViewStyle;
  titleStyle?: TextStyle;
}

export default function ModalList({
  visible,
  onClose,
  title,
  items,
  onSelectItem,
  hasSearch = false,
  searchPlaceholder = 'Search...',
  onSearchChange,
  multiSelect = false,
  selectedItems = [],
  onSelectionChange,
  maxHeight,
  renderItem,
  renderEmptyState,
  headerActions,
  footerActions,
  containerStyle,
  itemStyle,
  titleStyle,
}: ModalListProps) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [internalSelectedItems, setInternalSelectedItems] = useState<string[]>(selectedItems);
  
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Calculate modal height based on content
  const calculateModalHeight = () => {
    const headerHeight = 60; // Approximate header height
    const searchHeight = hasSearch ? 80 : 0;
    const itemHeight = 72; // Approximate item height
    const footerHeight = footerActions ? 80 : 0;
    const padding = 40;
    
    const contentHeight = headerHeight + searchHeight + (items.length * itemHeight) + footerHeight + padding;
    const maxAllowedHeight = SCREEN_HEIGHT - insets.top - 50; // Leave some space from top
    
    if (maxHeight) {
      return Math.min(maxHeight, maxAllowedHeight);
    }
    
    return Math.min(contentHeight, maxAllowedHeight);
  };

  const modalHeight = calculateModalHeight();

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
      setSearchQuery('');
    });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearchChange?.(query);
  };

  const handleItemPress = (item: ModalListItem) => {
    if (item.disabled) return;
    
    if (multiSelect) {
      const newSelection = internalSelectedItems.includes(item.id)
        ? internalSelectedItems.filter(id => id !== item.id)
        : [...internalSelectedItems, item.id];
      
      setInternalSelectedItems(newSelection);
      onSelectionChange?.(newSelection);
    } else {
      onSelectItem(item);
      if (!multiSelect) {
        handleClose();
      }
    }
  };

  const renderDefaultItem = (item: ModalListItem, index: number) => {
    const isSelected = multiSelect 
      ? internalSelectedItems.includes(item.id) 
      : item.isSelected;
    const isLast = index === items.length - 1;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.modalItem,
          {
            backgroundColor: item.backgroundColor || (isSelected ? appTheme.colors.primary + '10' : 'transparent'),
            borderBottomColor: appTheme.colors.borderColor,
          },
          isLast && styles.modalItemLast,
          item.disabled && styles.modalItemDisabled,
          itemStyle,
        ]}
        onPress={() => handleItemPress(item)}
        disabled={item.disabled}
      >
        <View style={styles.itemRow}>
          {/* Avatar or Icon */}
          {item.avatar ? (
            <Image 
              source={{ uri: item.avatar }} 
              style={styles.modalItemAvatar}
            />
          ) : (
            <View style={[
              styles.modalItemAvatarPlaceholder,
              { backgroundColor: appTheme.colors.inputBackground }
            ]}>
              <Icon 
                name={item.icon || 'person'} 
                size={24} 
                color={item.iconColor || appTheme.colors.textLight} 
              />
            </View>
          )}
          
          {/* Item info */}
          <View style={styles.modalItemInfo}>
            <Text style={[
              styles.modalItemName,
              { color: appTheme.colors.text },
              item.disabled && { color: appTheme.colors.textLight }
            ]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={[
                styles.modalItemDetails,
                { color: appTheme.colors.textLight }
              ]}>
                {item.subtitle}
              </Text>
            )}
          </View>
          
          {/* Selection indicator */}
          {multiSelect && (
            <View style={styles.checkbox}>
              {isSelected ? (
                <View style={[styles.checkboxChecked, { backgroundColor: appTheme.colors.primary }]}>
                  <Icon name="checkmark" size={18} color="white" />
                </View>
              ) : (
                <View style={[styles.checkboxUnchecked, { borderColor: appTheme.colors.borderColor }]} />
              )}
            </View>
          )}
          
          {/* Single select indicator */}
          {!multiSelect && isSelected && (
            <Icon name="checkmark" size={20} color={appTheme.colors.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchBar = () => {
    if (!hasSearch) return null;

    return (
      <View style={styles.searchBarContainer}>
        <View style={[styles.customSearchBar, { backgroundColor: appTheme.colors.inputBackground }]}>
          <Icon name="search" size={20} color={appTheme.colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={[styles.customSearchInput, { color: appTheme.colors.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={appTheme.colors.textLight}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearButton}>
              <Icon name="close-circle" size={20} color={appTheme.colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const renderDefaultEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="list" size={48} color={appTheme.colors.textLight} />
      <Text style={[styles.emptyStateText, { color: appTheme.colors.textLight }]}>
        {hasSearch && searchQuery ? 'No results found' : 'No items available'}
      </Text>
      {hasSearch && searchQuery && (
        <Text style={[styles.emptyStateSubtext, { color: appTheme.colors.textLight }]}>
          Try searching with different keywords
        </Text>
      )}
    </View>
  );

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
          { opacity: overlayOpacity }
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
              backgroundColor: appTheme.colors.surface,
              height: modalHeight,
              transform: [{ translateY: contentTranslateY }]
            },
            containerStyle
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }, titleStyle]}>
              {title}
            </Text>
            <View style={styles.headerActions}>
              {headerActions}
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={appTheme.colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Search Bar */}
          {renderSearchBar()}
          
          {/* List */}
          <ScrollView 
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              items.length === 0 && styles.emptyScrollContent
            ]}
          >
            {items.length > 0 ? (
              items.map((item, index) => 
                renderItem ? renderItem(item, index) : renderDefaultItem(item, index)
              )
            ) : (
              renderEmptyState ? renderEmptyState() : renderDefaultEmptyState()
            )}
          </ScrollView>
          
          {/* Footer */}
          {footerActions && (
            <View style={[styles.footerActions, { borderTopColor: appTheme.colors.borderColor }]}>
              {footerActions}
            </View>
          )}
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchBarContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  customSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  customSearchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  listContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  emptyScrollContent: {
    flex: 1,
    justifyContent: 'center',
  },
  modalItem: {
    height: 60,
    justifyContent: 'center',
    marginHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  modalItemLast: {
    borderBottomWidth: 0,
  },
  modalItemDisabled: {
    opacity: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  modalItemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  modalItemAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: 2,
  },
  modalItemDetails: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
  },
  checkbox: {
    marginLeft: 12,
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  footerActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
}); 