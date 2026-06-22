/**
 * ProductBuyerActions - Bottom action bar for buyers
 * Shows order/cart actions and messaging options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { AppButton } from '@/shared/components/ui';
import { 
  BuyerCapabilities, 
  ProductAvailability, 
  ProductPricing,
  formatPrice,
} from '@/shared/types/productDetails';

interface ProductBuyerActionsProps {
  productId: string;
  capabilities: BuyerCapabilities;
  availability: ProductAvailability;
  pricing: ProductPricing;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
  onOrder: () => void;
  onMessageSeller: () => void;
  onNotifyRestock?: () => void;
}

const ProductBuyerActions: React.FC<ProductBuyerActionsProps> = ({
  productId,
  capabilities,
  availability,
  pricing,
  quantity,
  onQuantityChange,
  onAddToCart,
  onOrder,
  onMessageSeller,
  onNotifyRestock,
}) => {
  const { theme: appTheme } = useTheme();

  // If price is hidden, show a connect prompt instead of order controls
  if (pricing.priceHidden) {
    return (
      <View style={[styles.container, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
        <View style={styles.outOfStockContainer}>
          <View style={styles.outOfStockInfo}>
            <Icon name="lock-closed-outline" size={24} color={appTheme.colors.textMuted} />
            <View style={styles.outOfStockText}>
              <Text style={[styles.outOfStockTitle, { color: appTheme.colors.text }]}>
                Connect to see price
              </Text>
              <Text style={[styles.restockDate, { color: appTheme.colors.textSecondary }]}>
                Prices are only visible to connected businesses
              </Text>
            </View>
          </View>
          {capabilities.canMessageSeller && (
            <TouchableOpacity
              style={[styles.messageButton, { backgroundColor: appTheme.colors.surface }]}
              onPress={onMessageSeller}
              activeOpacity={0.7}
            >
              <Icon name="chatbubble-outline" size={20} color={appTheme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const isDisabled = !capabilities.canOrder || availability.isOutOfStock;
  const moq = availability.moq || 1;
  const maxQty = availability.maxOrderQuantity || 99;

  // Calculate total price
  const unitPrice = pricing.promo?.price || pricing.basePrice;
  const totalPrice = unitPrice * quantity;

  // Adjust quantity respecting MOQ and max
  const handleQuantityChange = (delta: number) => {
    let newQuantity = quantity + delta;
    
    // Respect MOQ
    if (newQuantity < moq) {
      newQuantity = moq;
    }
    
    // Respect max
    if (newQuantity > maxQty) {
      newQuantity = maxQty;
    }
    
    // Respect stock if known
    if (availability.stockQuantity !== undefined && newQuantity > availability.stockQuantity) {
      newQuantity = availability.stockQuantity;
    }
    
    if (newQuantity !== quantity) {
      onQuantityChange(newQuantity);
    }
  };

  // Out of stock state
  if (availability.isOutOfStock) {
    return (
      <View style={[styles.container, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
        <View style={styles.outOfStockContainer}>
          <View style={styles.outOfStockInfo}>
            <Icon name="alert-circle-outline" size={24} color={appTheme.colors.error} />
            <View style={styles.outOfStockText}>
              <Text style={[styles.outOfStockTitle, { color: appTheme.colors.text }]}>
                Out of Stock
              </Text>
              {availability.restockDate && (
                <Text style={[styles.restockDate, { color: appTheme.colors.textSecondary }]}>
                  Expected: {availability.restockDate}
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.outOfStockActions}>
            {onNotifyRestock && (
              <AppButton
                title="Notify Me"
                onPress={onNotifyRestock}
                variant="outline"
                size="small"
                iconLeft="notifications-outline"
              />
            )}

            {capabilities.canMessageSeller && (
              <TouchableOpacity
                style={[styles.messageButton, { backgroundColor: appTheme.colors.surface }]}
                onPress={onMessageSeller}
                activeOpacity={0.7}
              >
                <Icon name="chatbubble-outline" size={20} color={appTheme.colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.cardBackground, borderTopColor: appTheme.colors.borderColor }]}>
      {/* Price & Quantity Row */}
      <View style={styles.topRow}>
        {/* Total Price */}
        <View style={styles.priceSection}>
          <Text style={[styles.totalLabel, { color: appTheme.colors.textSecondary }]}>
            Total
          </Text>
          <Text style={[styles.totalPrice, { color: appTheme.colors.text }]}>
            {formatPrice(totalPrice, pricing.currency)}
          </Text>
        </View>

        {/* Quantity Selector */}
        <View style={styles.quantitySelector}>
          <TouchableOpacity
            style={[
              styles.quantityButton, 
              { backgroundColor: appTheme.colors.surface },
              quantity <= moq && styles.quantityButtonDisabled,
            ]}
            onPress={() => handleQuantityChange(-1)}
            disabled={quantity <= moq}
            activeOpacity={0.7}
          >
            <Icon 
              name="remove" 
              size={20} 
              color={quantity <= moq ? appTheme.colors.textMuted : appTheme.colors.text} 
            />
          </TouchableOpacity>
          
          <Text style={[styles.quantityText, { color: appTheme.colors.text }]}>
            {quantity}
          </Text>
          
          <TouchableOpacity
            style={[
              styles.quantityButton, 
              { backgroundColor: appTheme.colors.surface },
              quantity >= maxQty && styles.quantityButtonDisabled,
            ]}
            onPress={() => handleQuantityChange(1)}
            disabled={quantity >= maxQty}
            activeOpacity={0.7}
          >
            <Icon 
              name="add" 
              size={20} 
              color={quantity >= maxQty ? appTheme.colors.textMuted : appTheme.colors.text} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* MOQ Hint */}
      {moq > 1 && (
        <Text style={[styles.moqHint, { color: appTheme.colors.textMuted }]}>
          Minimum order: {moq} units
        </Text>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {/* Message Seller */}
        {capabilities.canMessageSeller && (
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: appTheme.colors.surface }]}
            onPress={onMessageSeller}
            activeOpacity={0.7}
          >
            <Icon name="chatbubble-outline" size={20} color={appTheme.colors.text} />
          </TouchableOpacity>
        )}

        {/* Add to Cart */}
        {capabilities.canAddToCart && (
          <AppButton
            title="Add to Cart"
            onPress={onAddToCart}
            variant="outline"
            iconLeft="cart-outline"
            style={styles.flexButton}
          />
        )}

        {/* Order Now */}
        {capabilities.canOrder && (
          <AppButton
            title="Order Now"
            onPress={onOrder}
            variant="primary"
            style={styles.flexButton}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    borderTopWidth: 0.5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceSection: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: '700',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  moqHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexButton: {
    flex: 1,
  },
  // Out of stock styles
  outOfStockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outOfStockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  outOfStockText: {
    flex: 1,
  },
  outOfStockTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  restockDate: {
    fontSize: 13,
    marginTop: 2,
  },
  outOfStockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProductBuyerActions;

