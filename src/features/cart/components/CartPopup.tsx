import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useOrderStore, useCarts } from '@/shared/store/orderStore';
import { AppButton, TextButton } from '@/shared/components/ui';

interface CartPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onAddToCart: () => void;
  onGoToCart: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CartPopup: React.FC<CartPopupProps> = ({ 
  isVisible, 
  onClose, 
  onAddToCart,
  onGoToCart
}) => {
  const { theme: appTheme } = useTheme();
  const carts = useCarts();
  const { clearAllCarts } = useOrderStore();
  
  // Calculate totals across all carts
  const { totalItems, totalAmount } = useMemo(() => {
    let items = 0;
    let amount = 0;
    Object.values(carts).forEach(cart => {
      cart.items.forEach(item => {
        items += item.quantity;
        amount += item.product.price * item.quantity;
      });
    });
    return { totalItems: items, totalAmount: amount };
  }, [carts]);

  const hasItems = totalItems > 0;
  
  const formatCurrency = (amount: number): string => {
    return `Rs ${amount.toLocaleString()}`;
  };

  const handleCancel = () => {
    Alert.alert(
      "Clear Cart",
      "Do you want to clear everything?",
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes",
          onPress: () => {
            clearAllCarts();
            onClose();
          }
        }
      ]
    );
  };

  const handleAddToCart = () => {
    Alert.alert(
      "Added to cart!",
      "Order successfully added to your cart.\nCheck your cart to review your order.",
      [
        {
          text: "Continue order",
          onPress: () => onAddToCart()
        },
        {
          text: "Go to Cart",
          onPress: () => onGoToCart()
        }
      ]
    );
  };
  
  if (!isVisible || !hasItems) return null;

  return (
    <View style={styles.cartContainer}>
      <View style={[
        styles.cartContent, 
        { backgroundColor: appTheme.colors.primary }
      ]}>
        <View style={styles.cartInfo}>
          <View style={styles.leftSection}>
            <Text style={styles.itemsLabel}>Items</Text>
            <Text style={styles.totalLabel}>Total</Text>
          </View>
          
          <View style={styles.rightSection}>
            <Text style={styles.itemsValue}>{totalItems}</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>
        
        <AppButton
          title="Add to Cart"
          onPress={handleAddToCart}
          variant="secondary"
          fullWidth
        />

        <TextButton
          title="Cancel"
          onPress={handleCancel}
          style={styles.cancelButton}
          textStyle={styles.cancelText}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cartContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  cartContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    elevation: 10,
  },
  cartInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  leftSection: {
    alignItems: 'flex-start',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  itemsLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 8,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  itemsValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 8,
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  cancelButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#FFFFFF',
  },
});

export default CartPopup; 