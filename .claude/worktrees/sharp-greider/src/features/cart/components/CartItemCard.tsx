import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { Text as Typography, BodyBold, Caption, Label } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useOrderStore } from '@/shared/store/orderStore';

interface CartItemCardProps {
  item: {
    productId: string;
    quantity: number;
    product: any;
  };
  businessId: string;
}

const CartItemCard: React.FC<CartItemCardProps> = ({ item, businessId }) => {
  const { theme: appTheme } = useTheme();
  const { updateCartQuantity, removeFromCart } = useOrderStore();
  const [quantity, setQuantity] = useState(item.quantity);
  const quantityInputRef = useRef<TextInput>(null);

  const formatNumber = (num: number, type: 'currency' | 'stock'): string => {
    if (type === 'currency') {
      return `Rs ${num.toLocaleString()}`;
    } else {
      return num.toLocaleString();
    }
  };

  const handleQuantityChange = (text: string) => {
    // Allow empty string for editing - don't auto-set to 1
    if (text === '') {
      if (quantity !== 0) {
        setQuantity(0);
      }
      return;
    }
    
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText !== text) return; // Ignore non-numeric input
    
    const num = parseInt(numericText);
    if (!isNaN(num) && num > 0) {
      // Only update if value actually changed
      if (num !== quantity) {
        setQuantity(num);
        updateCartQuantity(businessId, item.productId, num);
      }
    }
  };

  const handleQuantityBlur = () => {
    // If quantity is 0 or empty when user finishes editing, set to 1
    if (quantity <= 0) {
      setQuantity(1);
      updateCartQuantity(businessId, item.productId, 1);
    }
  };

  const handleRemove = () => {
    removeFromCart(businessId, item.productId);
  };

  const totalAmount = item.product.price * quantity;

  return (
    <View style={[
      styles.cardContainer,
      { 
        backgroundColor: appTheme.colors.cardBackground,
        borderBottomColor: appTheme.colors.borderColor 
      }
    ]}>
      <View style={styles.productContent}>
        <View style={styles.imageContainer}>
          {item.product.imageUrl ? (
            <Image source={{ uri: item.product.imageUrl }} style={styles.productImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="image-outline" size={32} color={appTheme.colors.textLight} />
            </View>
          )}
        </View>
        <View style={styles.mainContentContainer}>
          <View style={styles.topRow}>
            <BodyBold style={[styles.productName, { color: appTheme.colors.text }]} numberOfLines={2}>
              {item.product.name}
            </BodyBold>
          </View>
          {item.product.unit && (
            <Caption style={[styles.productDetailText, styles.unitText, { color: appTheme.colors.textLight }]}>
              {item.product.unit}
            </Caption>
          )}
          <Text style={[styles.productPriceText, { color: appTheme.colors.text }]}>
            {formatNumber(item.product.price, 'currency')}
          </Text>
        </View>
      </View>
      
      {/* Remove Button */}
      <TouchableOpacity 
        style={[
          styles.removeButton, 
          { backgroundColor: '#F6F3F0' }
        ]}
        onPress={handleRemove}
      >
        <Icon 
          name="remove" 
          size={20} 
          color="#D0CAC8" 
        />
      </TouchableOpacity>

      {/* Quantity Section */}
      <View style={styles.quantitySection}>
        <View style={styles.quantityRow}>
          <View style={styles.quantityInputContainer}>
            <Label style={[styles.quantityLabel, { color: appTheme.colors.textLight }]}>
              Quantity
            </Label>
                         <TextInput
               ref={quantityInputRef}
               style={[styles.quantityInput, { 
                 color: appTheme.colors.text, 
                 borderColor: appTheme.colors.borderColor, 
                 backgroundColor: appTheme.colors.inputBackground 
               }]}
               value={quantity === 0 ? '' : quantity.toString()}
               onChangeText={handleQuantityChange}
               onBlur={handleQuantityBlur}
               keyboardType="number-pad"
               placeholder="1"
               placeholderTextColor="#D0CAC8"
               selectionColor={appTheme.colors.primary}
               selectTextOnFocus={false}
               autoFocus={false}
               blurOnSubmit={false}
               caretHidden={false}
               textContentType="none"
               autoCorrect={false}
               spellCheck={false}
             />
          </View>
          <View style={styles.totalContainer}>
            <Label style={[styles.totalLabel, { color: appTheme.colors.textLight }]}>
              Total
            </Label>
            <Text style={[styles.totalAmount, { color: appTheme.colors.text }]}>
              {formatNumber(totalAmount, 'currency')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: { 
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: theme.spacing.sm + 4, 
    paddingHorizontal: theme.spacing.md, 
    borderBottomWidth: 1, 
    position: 'relative',
    minHeight: 140,
  },
  productContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
    paddingRight: 48, // Space for absolute positioned button
  },
  imageContainer: { 
    width: 64, 
    height: 64, 
    marginRight: theme.spacing.md - 4 
  },
  productImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: theme.borderRadius.md, 
    backgroundColor: '#F0F0F0' 
  },
  imagePlaceholder: { 
    width: '100%', 
    height: '100%', 
    borderRadius: theme.borderRadius.md, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  mainContentContainer: { 
    flex: 1, 
    justifyContent: 'flex-start' 
  },
  topRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 0 
  },
  productName: { 
    flex: 1, 
    marginRight: theme.spacing.sm,
    marginBottom: 0
  },
  unitText: { 
    marginBottom: 0
  },
  productDetailText: { 
  },
  productPriceText: { 
    fontFamily: theme.fonts.primary.medium
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
    position: 'absolute',
    right: theme.spacing.md,
    top: 32,
  },
  quantitySection: {
    paddingTop: 8,
    width: '100%',
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  quantityInputContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
    minWidth: 100,
  },
  quantityLabel: {
    marginBottom: 4,
  },
  quantityInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.regular,
  },
  totalContainer: {
    alignItems: 'flex-end',
    flex: 1,
    minWidth: 100,
    justifyContent: 'center',
  },
  totalLabel: {
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default CartItemCard; 