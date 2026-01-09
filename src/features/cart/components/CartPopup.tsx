import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useAppStore } from '@/shared/store';

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
  const { cartItems, clearCart } = useAppStore();
  
  // Calculate totals
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
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
            clearCart();
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
  
  if (!isVisible || cartItems.length === 0) return null;

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
        
        <TouchableOpacity 
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          activeOpacity={0.8}
        >
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
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
  addToCartButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CartPopup; 