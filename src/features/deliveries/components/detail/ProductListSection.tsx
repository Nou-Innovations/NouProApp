/**
 * ProductListSection Component
 * 
 * Displays the product list table with configurable permissions for:
 * - Warehouse selector
 * - Stock warnings
 * - Loaded checkbox toggle
 * - Item status menu
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import LocationDropdown from '@/shared/components/ui/LocationDropdown';
import type { DeliveryItem } from '@/shared/types/delivery';

interface ProductListSectionProps {
  /** Array of delivery items */
  items: DeliveryItem[];
  /** Current warehouse/location name for stock display */
  currentWarehouseName?: string;
  /** Permission flags */
  showWarehouseSelector?: boolean;
  showStockWarnings?: boolean;
  canToggleLoaded?: boolean;
  showItemStatusMenu?: boolean;
  /** Callbacks */
  onItemLoadedToggle?: (itemId: string) => void;
  onItemStatusChange?: (itemId: string, status: DeliveryItem['status']) => void;
  onWarehouseChange?: (locationId: string | null) => void;
  /** Selected location ID for warehouse dropdown */
  selectedLocationId?: string | null;
}

export function ProductListSection({
  items,
  currentWarehouseName = 'Warehouse A',
  showWarehouseSelector = false,
  showStockWarnings = false,
  canToggleLoaded = false,
  showItemStatusMenu = false,
  onItemLoadedToggle,
  onItemStatusChange,
  onWarehouseChange,
  selectedLocationId,
}: ProductListSectionProps) {
  // Handle item status change
  const handleItemStatusChange = (itemId: string) => {
    if (!showItemStatusMenu || !onItemStatusChange) return;

    Alert.alert(
      'Update Item Status',
      'Select new status:',
      [
        { text: 'Available', onPress: () => onItemStatusChange(itemId, 'Available') },
        { text: 'In Stock', onPress: () => onItemStatusChange(itemId, 'In Stock') },
        { text: 'Out of Stock', onPress: () => onItemStatusChange(itemId, 'Out of Stock') },
        { text: 'In Production', onPress: () => onItemStatusChange(itemId, 'In Production') },
        { text: 'Discontinued', onPress: () => onItemStatusChange(itemId, 'Discontinued') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Product List</Text>

      {/* Warehouse Selector */}
      {showWarehouseSelector && (
        <View style={styles.warehouseRow}>
          <Text style={styles.infoLabel}>Warehouse:</Text>
          <View style={styles.warehouseDropdown}>
            <LocationDropdown
              style={{ flex: 1 }}
              onLocationSelect={onWarehouseChange}
              selectedLocationId={selectedLocationId}
            />
          </View>
        </View>
      )}

      {/* Product List Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { width: 32, textAlign: 'center' }]}>#</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'left' }]}>Products</Text>
        <Text style={[styles.tableHeaderCell, { width: 140, paddingHorizontal: 8, textAlign: 'center' }]}>Qty</Text>
        <Text style={[styles.tableHeaderCell, { width: 60, textAlign: 'center' }]}>Loaded</Text>
        {showItemStatusMenu && <View style={{ width: 32 }} />}
      </View>

      {/* Product Items */}
      {items.map((item, index) => {
        const availableStock = item.warehouseStock?.[currentWarehouseName] || 0;
        const hasStockWarning = showStockWarnings && item.warehouseStock && availableStock < item.quantityOrdered;

        return (
          <View key={item.id} style={styles.tableRowContainer}>
            <View style={styles.tableRow}>
              {/* Index */}
              <Text style={[styles.tableCell, styles.indexCell]}>{index + 1}</Text>

              {/* Product Info */}
              <View style={[styles.tableCell, { flex: 1 }]}>
                <View style={styles.productInfoContainer}>
                  <Image source={{ uri: item.image }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>
                      {item.name.replace(/ x\d+$/, '').split(' ').slice(0, -1).join(' ')}
                    </Text>
                    <Text style={styles.unitInfo}>
                      {item.name.replace(/ x\d+$/, '').split(' ').slice(-1)[0]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quantity */}
              <View style={[styles.tableCell, styles.qtyCell]}>
                <Text style={[
                  styles.qtyText,
                  item.quantityOrdered.toString().length > 5 && { fontSize: 14 }
                ]}>
                  {item.quantityOrdered}
                </Text>
                {hasStockWarning && (
                  <Text style={styles.stockWarning}>
                    {availableStock === 0 ? '0 left' : `Only ${availableStock} left`}
                  </Text>
                )}
              </View>

              {/* Loaded Checkbox */}
              <View style={[styles.tableCell, styles.loadedCell]}>
                {canToggleLoaded && onItemLoadedToggle ? (
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => onItemLoadedToggle(item.id)}
                  >
                    {item.isLoaded ? (
                      <View style={styles.checkboxChecked}>
                        <Icon name="checkmark" size={20} color="white" />
                      </View>
                    ) : (
                      <View style={styles.checkboxUnchecked} />
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.checkboxContainer}>
                    {item.isLoaded ? (
                      <View style={styles.checkboxChecked}>
                        <Icon name="checkmark" size={20} color="white" />
                      </View>
                    ) : (
                      <View style={styles.checkboxUnchecked} />
                    )}
                  </View>
                )}
              </View>

              {/* Item Status Menu */}
              {showItemStatusMenu && (
                <View style={[styles.tableCell, styles.menuCell]}>
                  <TouchableOpacity onPress={() => handleItemStatusChange(item.id)}>
                    <Icon name="ellipsis-vertical" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'InterCustom-SemiBold',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  warehouseRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.text,
    marginBottom: 8,
    fontFamily: 'InterCustom-SemiBold',
  },
  warehouseDropdown: {
    flexDirection: 'row',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 0,
    paddingLeft: 4,
    height: 48,
    alignItems: 'center',
  },
  tableHeaderCell: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: 'InterCustom-SemiBold',
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  tableRowContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderColor,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingLeft: 4,
  },
  tableCell: {
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  indexCell: {
    width: 32,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 48,
  },
  qtyCell: {
    width: 140,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadedCell: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCell: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  productInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginRight: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontFamily: 'InterCustom-SemiBold',
    color: theme.colors.text,
  },
  unitInfo: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: 'InterCustom-Medium',
    marginTop: 2,
  },
  qtyText: {
    fontSize: 18,
    fontFamily: 'InterCustom-SemiBold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  stockWarning: {
    fontSize: 14,
    fontFamily: 'InterCustom-SemiBold',
    color: theme.colors.error,
    marginTop: 4,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProductListSection;
