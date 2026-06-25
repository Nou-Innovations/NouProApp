/**
 * ProductOwnerActions - Bottom action bar for product owners
 * Shows edit, stock management, and other owner-specific actions
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { OwnerCapabilities, ProductAvailability } from '@/shared/types/productDetails';

interface ProductOwnerActionsProps {
  productId: string;
  capabilities: OwnerCapabilities;
  availability: ProductAvailability;
  isListed: boolean;
  onEdit: () => void;
  onManageStock: () => void;
  onChangePrice: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleListing: (listed: boolean) => void;
}

const ProductOwnerActions: React.FC<ProductOwnerActionsProps> = ({
  productId,
  capabilities,
  availability,
  isListed,
  onEdit,
  onManageStock,
  onChangePrice,
  onArchive,
  onDelete,
  onDuplicate,
  onToggleListing,
}) => {
  const { theme: appTheme } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleArchive = () => {
    AppAlert.alert(
      'Archive Product',
      'This product will be hidden from your catalog but preserved for order history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', onPress: onArchive },
      ]
    );
  };

  const handleDelete = () => {
    AppAlert.alert(
      'Delete Product',
      'This action cannot be undone. Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const handleToggleListing = () => {
    const message = isListed
      ? 'This will hide the product from your public catalog.'
      : 'This will show the product in your public catalog.';
    
    AppAlert.alert(
      isListed ? 'Unlist Product' : 'List Product',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => onToggleListing(!isListed) },
      ]
    );
  };

  // If user has no edit capabilities at all, show view-only message
  if (!capabilities.canEdit && !capabilities.canManageStock) {
    return (
      <View style={[styles.container, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
        <View style={styles.viewOnlyContainer}>
          <Icon name="eye-outline" size={20} color={appTheme.colors.textMuted} />
          <Text style={[styles.viewOnlyText, { color: appTheme.colors.textMuted }]}>
            View Only
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
      {/* Primary Action - Edit */}
      {capabilities.canEdit && (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: appTheme.colors.primary }]}
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <Icon name="create-outline" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Edit Product</Text>
        </TouchableOpacity>
      )}

      {/* Secondary Actions */}
      <View style={styles.secondaryActions}>
        {/* Stock Management */}
        {capabilities.canManageStock && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: appTheme.colors.surface }]}
            onPress={onManageStock}
            activeOpacity={0.7}
          >
            <Icon 
              name="cube-outline" 
              size={22} 
              color={availability.isLowStock ? appTheme.colors.warning : appTheme.colors.text} 
            />
          </TouchableOpacity>
        )}

        {/* More Options Menu */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: appTheme.colors.surface }]}
          onPress={() => setShowMoreMenu(!showMoreMenu)}
          activeOpacity={0.7}
        >
          <Icon name="ellipsis-horizontal" size={22} color={appTheme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* More Options Dropdown */}
      {showMoreMenu && (
        <View style={[styles.menuDropdown, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          {capabilities.canChangePrice && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMoreMenu(false);
                onChangePrice();
              }}
            >
              <Icon name="pricetag-outline" size={20} color={appTheme.colors.text} />
              <Text style={[styles.menuItemText, { color: appTheme.colors.text }]}>
                Change Price
              </Text>
            </TouchableOpacity>
          )}

          {capabilities.canToggleListing && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMoreMenu(false);
                handleToggleListing();
              }}
            >
              <Icon 
                name={isListed ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={appTheme.colors.text} 
              />
              <Text style={[styles.menuItemText, { color: appTheme.colors.text }]}>
                {isListed ? 'Unlist Product' : 'List Product'}
              </Text>
            </TouchableOpacity>
          )}

          {capabilities.canDuplicate && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMoreMenu(false);
                onDuplicate();
              }}
            >
              <Icon name="copy-outline" size={20} color={appTheme.colors.text} />
              <Text style={[styles.menuItemText, { color: appTheme.colors.text }]}>
                Duplicate
              </Text>
            </TouchableOpacity>
          )}

          {capabilities.canArchive && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMoreMenu(false);
                handleArchive();
              }}
            >
              <Icon name="archive-outline" size={20} color={appTheme.colors.warning} />
              <Text style={[styles.menuItemText, { color: appTheme.colors.warning }]}>
                Archive
              </Text>
            </TouchableOpacity>
          )}

          {capabilities.canDelete && (
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => {
                setShowMoreMenu(false);
                handleDelete();
              }}
            >
              <Icon name="trash-outline" size={20} color={appTheme.colors.error} />
              <Text style={[styles.menuItemText, { color: appTheme.colors.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    borderTopWidth: 0.5,
  },
  viewOnlyContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  viewOnlyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginRight: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDropdown: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default ProductOwnerActions;

