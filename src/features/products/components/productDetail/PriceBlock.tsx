/**
 * PriceBlock — large price with three states:
 *  - normal:   bold current price
 *  - promo:    current price + struck original + "-XX%" pill
 *  - hidden:   "Connect to see price" (lock icon)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { ProductPricing, formatPrice } from '@/shared/types/productDetails';

interface Props {
  pricing: ProductPricing;
}

const PriceBlock: React.FC<Props> = ({ pricing }) => {
  const { theme: appTheme } = useTheme();

  if (pricing.priceHidden) {
    return (
      <View style={styles.lockedRow}>
        <Icon name="lock-closed-outline" size={18} color={appTheme.colors.textMuted} />
        <Text style={[styles.lockedText, { color: appTheme.colors.textMuted }]}>
          Connect to see price
        </Text>
      </View>
    );
  }

  const originalPrice = (pricing as any).originalPrice as number | undefined;
  const hasOriginal = typeof originalPrice === 'number' && originalPrice > pricing.basePrice;
  const percentOff =
    pricing.promo?.percentOff ??
    (hasOriginal ? Math.round((1 - pricing.basePrice / originalPrice!) * 100) : undefined);

  return (
    <View style={styles.row}>
      <Text style={[styles.current, { color: appTheme.colors.text }]}>
        {formatPrice(pricing.basePrice, pricing.currency)}
      </Text>

      {hasOriginal && (
        <View style={styles.originalWrap}>
          <Text style={[styles.original, { color: appTheme.colors.textMuted }]}>
            {formatPrice(originalPrice!, pricing.currency)}
          </Text>
          <View style={[styles.strike, { backgroundColor: appTheme.colors.textMuted }]} />
        </View>
      )}

      {!!percentOff && percentOff > 0 && (
        <View style={[styles.promoPill, { backgroundColor: appTheme.colors.accent }]}>
          <Text style={styles.promoText}>-{percentOff}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  current: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  originalWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  original: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.medium,
  },
  strike: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
  },
  promoPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  promoText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.bold,
    color: '#FFFFFF',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  lockedText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default PriceBlock;
