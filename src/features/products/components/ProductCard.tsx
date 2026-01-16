import React, { useState } from 'react';
import {
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  TextInput,
  Switch,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { UIProduct, UIProductStatus } from '@/shared/types/product';

// Re-export for backward compatibility
type Product = UIProduct;
type ProductStatus = UIProductStatus;
import Pill from '@/shared/components/ui/Pill';
import theme from '@/shared/theme';
import { Text, BodyBold, Caption, Label } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';

// Helper function to format numbers
const formatNumber = (value: number | undefined | null, type: 'currency' | 'stock'): string => {
  if (value === null || value === undefined) {
    return type === 'currency' ? 'Rs 0.00' : '0';
  }
  const numStr = value.toLocaleString('en-US', {
    minimumFractionDigits: type === 'currency' ? 2 : 0,
    maximumFractionDigits: type === 'currency' ? 2 : 0,
  });
  return type === 'currency' ? `Rs ${numStr}` : numStr;
};

const productStatuses: ProductStatus[] = ['Available', 'Out of Stock', 'In Production', 'Inactive', 'Discontinued'];

// Status Pill sub-component
const getProductStatusColor = (status: ProductStatus | undefined) => {
  if (!status) return theme.colors.neutral;
  switch (status.toLowerCase()) {
    case 'available': return theme.colors.success;
    case 'out of stock': return theme.colors.error;
    case 'in production': return theme.colors.info;
    case 'inactive': return theme.colors.neutral;
    case 'discontinued': return theme.colors.warning;
    default: return theme.colors.neutral;
  }
};

interface ProductCardProps {
  product: Product;
  isEditing: boolean;
  onPress?: () => void;
  onUpdate?: (field: keyof Product, value: any) => void;
  /** Called when publish toggle is pressed. Allows parent to check paywall before toggling. */
  onPublishToggle?: (productId: string, currentPublishState: boolean) => void;
  /** Whether to show the publish toggle (requires paid plan). Default: true */
  showPublishToggle?: boolean;
  /** Whether this is the last product in a list/group */
  isLastProduct?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  isEditing, 
  onPress, 
  onUpdate,
  onPublishToggle,
  showPublishToggle = true,
  isLastProduct = false,
}) => {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { theme: appTheme } = useTheme();
  
  // Handle publish toggle - delegates to parent for paywall check
  const handlePublishToggle = () => {
    if (onPublishToggle) {
      onPublishToggle(product.id, product.isDisplayable ?? false);
    } else {
      // Fallback to direct update if no handler provided
      onUpdate?.('isDisplayable', !(product.isDisplayable ?? false));
    }
  };

  const handleTextChange = (field: 'price' | 'stockQuantity', text: string) => {
    const rawValue = text.replace(/[^0-9.]/g, '');
    const numericValue = parseFloat(rawValue);
    if (!isNaN(numericValue)) {
      onUpdate?.(field, numericValue);
    } else if (text === '') {
      onUpdate?.(field, null);
    }
  };

  const toggleStatusModal = () => {
    if (!isEditing) return;
    setShowStatusModal(!showStatusModal);
  };

  const handleSelectStatus = (newStatus: ProductStatus) => {
    onUpdate?.('status', newStatus);
    setShowStatusModal(false);
  };

  if (isEditing) {
    return (
      <View
        style={[
          styles.cardContainerEditing,
          {
            backgroundColor: appTheme.colors.cardBackground,
            borderBottomColor: isLastProduct ? appTheme.colors.primary : appTheme.colors.surface,
          },
        ]}
      >
        <View style={styles.topSectionEditing}>
          <View style={styles.imageContainerEditing}>
            {product.productPicture ? (
              <Image source={{ uri: product.productPicture }} style={styles.productImage} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: appTheme.colors.inputBackground }]}>
                <Icon name="image-outline" size={32} color={appTheme.colors.textSecondary} />
              </View>
            )}
          </View>

          <View style={styles.nameAndUnitColumnEditing}>
            <BodyBold style={[styles.productNameEditing, { color: appTheme.colors.text }]} numberOfLines={2}>{product.name}</BodyBold>
            {product.unit && (
              <Caption style={[styles.unitTextEditing, { color: appTheme.colors.textSecondary }]}>{product.unit}</Caption>
            )}
          </View>

          <View style={styles.statusAndListedColumnEditing}>
            <TouchableOpacity onPress={toggleStatusModal} style={styles.statusButtonPillEditing}>
              <Pill 
                text={product.status?.toLowerCase() ?? 'unknown'}
                color={getProductStatusColor(product.status)}
              />
            </TouchableOpacity>
            {showPublishToggle && (
              <View style={styles.publishSectionEditing}>
                <Label style={[
                  styles.publishLabel, 
                  { color: product.isDisplayable ? appTheme.colors.success : appTheme.colors.textMuted }
                ]}>
                  {product.isDisplayable ? 'Public' : 'Private'}
                </Label> 
                <Switch
                    trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E9E9EA"
                    onValueChange={handlePublishToggle}
                    value={product.isDisplayable ?? false}
                    style={styles.switchControl}
                />
              </View>
            )}
          </View>
        </View>

        <View style={styles.fieldsContainerEditing}>
          <View style={[styles.fieldGroupEditing, { marginRight: 4 }]} >
            <Label style={[styles.fieldLabelEditing, { color: appTheme.colors.textSecondary }]}>In stock</Label>
            <TextInput
              style={[styles.inputFieldEditing, { 
                color: appTheme.colors.text, 
                borderColor: appTheme.colors.borderColor, 
                backgroundColor: appTheme.colors.inputBackground 
              }]}
              value={product.stockQuantity?.toString() ?? ''}
              onChangeText={(text) => handleTextChange('stockQuantity', text)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={appTheme.colors.textSecondary}
            />
          </View>
          <View style={[styles.fieldGroupEditing, { marginLeft: 4 }]} >
            <Label style={[styles.fieldLabelEditing, { color: appTheme.colors.textSecondary }]}>Price</Label>
            <TextInput
              style={[styles.inputFieldEditing, { 
                color: appTheme.colors.text, 
                borderColor: appTheme.colors.borderColor, 
                backgroundColor: appTheme.colors.inputBackground 
              }]}
              value={product.price?.toString() ?? ''}
              onChangeText={(text) => handleTextChange('price', text)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={appTheme.colors.textSecondary}
            />
          </View>
        </View>

        <AppBottomSheet
          visible={showStatusModal}
          onClose={toggleStatusModal}
          title="Availability"
        >
          {productStatuses.map((statusOption, index) => (
            <TouchableOpacity
              key={statusOption}
              style={[
                styles.statusModalItem,
                { borderBottomColor: appTheme.colors.borderColor },
                index === productStatuses.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => handleSelectStatus(statusOption)}
            >
              <View
                style={[
                  styles.statusModalColorIndicator,
                  { backgroundColor: getProductStatusColor(statusOption) },
                ]}
              />
              <Text style={[styles.statusModalItemText, { color: appTheme.colors.text }]}>
                {statusOption}
              </Text>
            </TouchableOpacity>
          ))}
        </AppBottomSheet>
      </View>
    );
  } else {
    return (
      <TouchableOpacity 
        style={[
          styles.cardContainer, 
          { 
            backgroundColor: appTheme.colors.cardBackground,
            borderBottomColor: isLastProduct ? appTheme.colors.primary : appTheme.colors.surface,
          }
        ]} 
        onPress={onPress} 
        disabled={isEditing}
      >
        <View style={styles.imageContainer}>
          {product.productPicture ? (
            <Image source={{ uri: product.productPicture }} style={styles.productImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: appTheme.colors.inputBackground }]}>
              <Icon name="image-outline" size={32} color={appTheme.colors.textSecondary} />
            </View>
          )}
        </View>
        <View style={styles.mainContentContainer}>
          <View style={styles.infoRow}>
            <BodyBold style={[styles.productName, { color: appTheme.colors.text }]} numberOfLines={2}>
              {product.name}
            </BodyBold>
            <Text
              style={[
                styles.availabilityStatus,
                { color: getProductStatusColor(product.status) },
              ]}
            >
              {product.status ?? 'Unknown'}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowSpacing]}>
            {product.unit ? (
              <Text style={[styles.unitText, { color: appTheme.colors.textSecondary }]}>
                {product.unit}
              </Text>
            ) : (
              <View style={styles.leftSpacer} />
            )}
            <Text
              style={[
                styles.publicStatus,
                {
                  color: product.isDisplayable
                    ? appTheme.colors.success
                    : appTheme.colors.textMuted,
                },
              ]}
            >
              {product.isDisplayable ? 'Public' : 'Private'}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowSpacing]}>
            <Text style={[styles.stockStatus, { color: appTheme.colors.textSecondary }]}>
              In stock: {formatNumber(product.stockQuantity, 'stock')}
            </Text>
            <Text style={[styles.productPriceText, { color: appTheme.colors.secondary }]}>
              {formatNumber(product.price, 'currency')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
};

const styles = StyleSheet.create({
  cardContainer: { 
    flexDirection: 'row', 
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md, 
    borderBottomWidth: 1, 
    alignItems: 'center',
  },
  imageContainer: { 
    width: 64, 
    height: 64, 
    marginRight: 12,
  },
  productImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: theme.borderRadius.md, 
    backgroundColor: theme.colors.surface,
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
    marginBottom: 4,
  },
  productName: { 
    flex: 1, 
    marginRight: theme.spacing.sm 
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoRowSpacing: {
    marginTop: 4,
  },
  availabilityStatus: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    textAlign: 'right',
  },
  unitText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  publicStatus: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    textAlign: 'right',
  },
  stockStatus: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  productPriceText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    textAlign: 'right',
  },
  leftSpacer: {
    flex: 1,
  },

  cardContainerEditing: { 
    padding: theme.spacing.md, 
    borderBottomWidth: 1, 
  },
  topSectionEditing: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 0,
  },
  imageContainerEditing: { 
    width: 64, 
    height: 64, 
    marginRight: theme.spacing.md - 4 
  },
  nameAndUnitColumnEditing: {
    flex: 1,
    justifyContent: 'flex-start',
    marginRight: theme.spacing.sm,
  },
  productNameEditing: { 
    marginBottom: theme.spacing.sm 
  },
  unitTextEditing: { 
  },
  statusAndListedColumnEditing: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  statusButtonPillEditing: { 
    marginBottom: theme.spacing.sm,
  },
  publishSectionEditing: { 
    flexDirection: 'row',
    alignItems: 'center',
  },
  publishLabel: { 
    marginRight: theme.spacing.sm,
    fontFamily: theme.fonts.primary.medium,
  },
  switchControl: { 
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] 
  },
  fieldsContainerEditing: { 
    flexDirection: 'row', 
    marginTop: 4,
  },
  fieldGroupEditing: { 
    flex: 1 
  },
  fieldLabelEditing: { 
    marginBottom: 4
  },
  inputFieldEditing: { 
    height: 40, 
    borderWidth: 1, 
    borderRadius: theme.borderRadius.md, 
    paddingHorizontal: 10, 
    fontSize: theme.fontSize.base, 
    fontFamily: theme.fonts.primary.regular,
  },
  statusModalItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: theme.spacing.sm + 6, 
    paddingHorizontal: theme.spacing.md, 
    borderBottomWidth: 1, 
  },
  statusModalColorIndicator: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    marginRight: theme.spacing.sm 
  },
  statusModalItemText: { 
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
  }
});

export default ProductCard; 