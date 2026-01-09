import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { Text, BodyBold, Caption, Label } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface ProductCardOtherCompanyProps {
  product: any;
  isAdding: boolean;
  quantity: number;
  onPress?: () => void;
  onStartAdding: () => void;
  onChangeQuantity: (qty: number) => void;
  onCancelAdding: () => void;
  onConfirmAdd: () => void;
}

const ProductCardOtherCompany: React.FC<ProductCardOtherCompanyProps> = ({ 
  product, 
  isAdding,
  quantity,
  onPress,
  onStartAdding,
  onChangeQuantity,
  onCancelAdding,
  onConfirmAdd,
}) => {
  const { theme: appTheme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const firstFocusRef = useRef(true);

  useEffect(() => {
    // Animate height/position changes smoothly
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // When entering "adding" mode, focus the input
    if (isAdding) {
      firstFocusRef.current = true;
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isAdding]);

  const formatNumber = (num: number, type: 'currency' | 'stock'): string => {
    if (type === 'currency') {
      return `Rs ${num.toLocaleString()}`;
    } else {
      return num.toLocaleString();
    }
  };

  const handleQuantityChange = (text: string) => {
    const num = parseInt(text, 10);
    onChangeQuantity(isNaN(num) ? 0 : num);
  };

  const handleQuantityFocus = () => {
    // Clear the default "1" only on the very first focus
    if (firstFocusRef.current && quantity === 1) {
      onChangeQuantity(0);
      firstFocusRef.current = false;
    }
  };

  const totalAmount = product.price * quantity;

  return (
    <View style={[
      styles.cardContainer, 
      isAdding && styles.expandedCard,
      { 
        backgroundColor: appTheme.colors.cardBackground,
        borderBottomColor: appTheme.colors.borderColor 
      }
    ]}>
      <TouchableOpacity 
        style={styles.productContent}
        onPress={onPress} 
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="image-outline" size={32} color={appTheme.colors.textLight} />
            </View>
          )}
        </View>
        <View style={styles.mainContentContainer}>
          <View style={styles.topRow}>
            <BodyBold style={[styles.productName, { color: appTheme.colors.text }]} numberOfLines={2}>
              {product.name}
            </BodyBold>
          </View>
          {product.unit && (
            <Caption style={[styles.productDetailText, styles.unitText, { color: appTheme.colors.textLight }]}>
              {product.unit}
            </Caption>
          )}
          <Text style={[styles.productPriceText, { color: appTheme.colors.text }]}>
            {formatNumber(product.price, 'currency')}
          </Text>
        </View>
      </TouchableOpacity>
      
      {/* Add/Remove Button */}
      {!isAdding && (
        <TouchableOpacity 
          style={[
            styles.addButton, 
            { backgroundColor: appTheme.colors.primary }
          ]}
          onPress={onStartAdding}
        >
          <Icon 
            name="add" 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      )}

      {/* Expanded Quantity Section */}
      {isAdding && (
        <View style={styles.quantitySection}>
          <View style={styles.quantityRow}>
            <View style={styles.quantityInputContainer}>
              <Label style={[styles.quantityLabel, { color: appTheme.colors.textLight }]}>
                Quantity
              </Label>
              <TextInput
                ref={inputRef}
                style={[styles.quantityInput, { 
                  color: appTheme.colors.text, 
                  borderColor: appTheme.colors.borderColor, 
                  backgroundColor: appTheme.colors.inputBackground 
                }]}
                value={quantity === 0 ? '' : quantity.toString()}
                onChangeText={handleQuantityChange}
                onFocus={handleQuantityFocus}
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
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.confirmButton, { backgroundColor: appTheme.colors.primary }]}
              onPress={onConfirmAdd}
            >
              <Text style={styles.confirmButtonText}>Add to Cart</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onCancelAdding}
            >
              <Icon name="close" size={20} color="#D0CAC8" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: { 
    flexDirection: 'row', 
    paddingVertical: theme.spacing.sm + 4, 
    paddingHorizontal: theme.spacing.md, 
    borderBottomWidth: 1, 
    alignItems: 'flex-start',
    position: 'relative',
    minHeight: 80,
  },
  expandedCard: {
    flexDirection: 'column',
    alignItems: 'stretch',
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
  addButton: {
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  confirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    color: '#FFFFFF',
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProductCardOtherCompany; 