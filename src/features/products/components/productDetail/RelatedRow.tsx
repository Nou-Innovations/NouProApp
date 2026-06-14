/**
 * RelatedRow — a single "More from…" horizontal section.
 * Header is tappable (with a › chevron) only when `onHeaderPress` is provided.
 * Renders nothing when there are no products.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { RelatedProduct } from '@/shared/types/productDetails';
import ProductMiniCard from './ProductMiniCard';

interface Props {
  title: string;
  products: RelatedProduct[];
  onProductPress: (id: string) => void;
  onHeaderPress?: () => void;
  isLast?: boolean;
}

const RelatedRow: React.FC<Props> = ({ title, products, onProductPress, onHeaderPress, isLast }) => {
  const { theme: appTheme } = useTheme();

  if (!products || products.length === 0) return null;

  const HeaderContent = (
    <View style={styles.headerRow}>
      <Text style={[styles.title, { color: appTheme.colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {onHeaderPress && (
        <Icon name="chevron-forward" size={20} color={appTheme.colors.textMuted} />
      )}
    </View>
  );

  return (
    <View style={[styles.section, { borderTopColor: appTheme.colors.borderColor }, isLast && styles.lastSection]}>
      {onHeaderPress ? (
        <TouchableOpacity activeOpacity={0.6} onPress={onHeaderPress}>
          {HeaderContent}
        </TouchableOpacity>
      ) : (
        HeaderContent
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {products.map((item) => (
          <ProductMiniCard key={item.id} item={item} onPress={() => onProductPress(item.id)} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lastSection: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: theme.fonts.primary.semiBold,
  },
  scrollContent: {
    gap: 14,
    paddingRight: 4,
  },
});

export default RelatedRow;
