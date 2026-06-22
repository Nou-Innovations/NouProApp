import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useOrderStore } from '@/shared/store/orderStore';
import { AppButton, TextButton } from '@/shared/components/ui';

interface CartBottomSectionProps {
  businessId: string;
  onPlaceOrder: () => void;
}

const CartBottomSection: React.FC<CartBottomSectionProps> = ({ businessId, onPlaceOrder }) => {
  const { theme: appTheme } = useTheme();
  const carts = useOrderStore((state) => state.carts);
  const { clearCart } = useOrderStore();
  
  const cart = carts[businessId];

  // Calculate totals for this specific business cart
  const { totalItems, totalAmount } = useMemo(() => {
    if (!cart) return { totalItems: 0, totalAmount: 0 };
    const items = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const amount = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    return { totalItems: items, totalAmount: amount };
  }, [cart]);
  
  const formatCurrency = (amount: number): string => {
    return `Rs ${amount.toLocaleString()}`;
  };

  const handleClearCart = () => {
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
          onPress: () => clearCart(businessId)
        }
      ]
    );
  };

  const handlePlaceOrder = () => {
    onPlaceOrder();
  };
  
  if (!cart || cart.items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={[
        styles.content, 
        { backgroundColor: appTheme.colors.primary }
      ]}>
        <View style={styles.summaryInfo}>
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
          title="Place Order"
          onPress={handlePlaceOrder}
          variant="secondary"
          fullWidth
          style={styles.placeOrderButton}
        />

        <TextButton
          title="Clear Cart"
          onPress={handleClearCart}
          style={styles.clearCartButton}
          textStyle={styles.clearCartText}
        />
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
    zIndex: 1000,
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  summaryInfo: {
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
  placeOrderButton: {
    marginBottom: 8,
  },
  clearCartButton: {
    alignSelf: 'center',
  },
  clearCartText: {
    color: '#FFFFFF',
  },
});

export default CartBottomSection; 