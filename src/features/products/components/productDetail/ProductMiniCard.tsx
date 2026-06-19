/**
 * ProductMiniCard — product card used inside RelatedRow horizontal lists.
 * Matches the "Popular products" card on the Explore screen (large image,
 * name, brand, price) with a plain (non-grey) image background.
 */
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { RelatedProduct, formatPrice } from '@/shared/types/productDetails';

interface Props {
  item: RelatedProduct;
  onPress: () => void;
}

const CARD_WIDTH = 160;
const IMG_HEIGHT = 180;

const ProductMiniCard: React.FC<Props> = ({ item, onPress }) => {
  const { theme: appTheme } = useTheme();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={[styles.image, { backgroundColor: appTheme.colors.background }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholder, { borderColor: appTheme.colors.borderColor }]}>
          <Icon name="cube-outline" size={30} color={appTheme.colors.textMuted} />
        </View>
      )}
      <Text style={[styles.name, { color: appTheme.colors.text }]} numberOfLines={2}>
        {item.name}
      </Text>
      {!!item.brand && (
        <Text style={[styles.brand, { color: appTheme.colors.textMuted }]} numberOfLines={1}>
          {item.brand}
        </Text>
      )}
      <Text
        style={[
          styles.price,
          { color: item.priceHidden ? appTheme.colors.textMuted : appTheme.colors.text },
        ]}
        numberOfLines={1}
      >
        {item.priceHidden ? 'Price on request' : formatPrice(item.price, item.currency)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  image: {
    width: CARD_WIDTH,
    height: IMG_HEIGHT,
    borderRadius: 12,
    marginBottom: 8,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    lineHeight: 20,
  },
  brand: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  price: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 4,
  },
});

export default ProductMiniCard;
