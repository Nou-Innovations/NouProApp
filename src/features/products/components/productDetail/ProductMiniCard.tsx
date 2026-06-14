/**
 * ProductMiniCard — premium card used inside RelatedRow horizontal lists.
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

const ProductMiniCard: React.FC<Props> = ({ item, onPress }) => {
  const { theme: appTheme } = useTheme();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: appTheme.colors.surface }]}>
          <Icon name="cube-outline" size={26} color={appTheme.colors.textMuted} />
        </View>
      )}
      <Text style={[styles.name, { color: appTheme.colors.text }]} numberOfLines={2}>
        {item.name}
      </Text>
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

const CARD_WIDTH = 132;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  image: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 16,
    marginBottom: 10,
  },
  placeholder: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 16,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
    lineHeight: 17,
    marginBottom: 3,
  },
  price: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.semiBold,
  },
});

export default ProductMiniCard;
