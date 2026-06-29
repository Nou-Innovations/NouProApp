/**
 * ProductGalleryScreen — Design System showroom for the app's PRODUCT screens.
 *
 * A menu that opens each real product screen / viewer-state with demo data
 * (owner / client-stocked / client-new detail, the new premium showcase, the
 * loading skeleton, and the management screens). Reached from the Business sidebar.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { SectionTitle } from '@/shared/components/ui';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import ProductDetailSkeleton from '@/features/products/components/productDetail/ProductDetailSkeleton';

interface Row {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
}

export default function ProductGalleryScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const [showSkeleton, setShowSkeleton] = useState(false);

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Product detail',
      rows: [
        { title: 'Distributor (owner)', subtitle: 'Edit, stock & supplier details', onPress: () => navigation.navigate('ProductDetail', { productId: 'PRD-demo' }) },
        { title: 'Client — already stocks it', subtitle: '"In your store" stock + Reorder', onPress: () => navigation.navigate('ProductDetail', { productId: 'stk-demo' }) },
        { title: 'Client — new buyer', subtitle: 'Order + seller & "More from…"', onPress: () => navigation.navigate('ProductDetail', { productId: 'prod-demo' }) },
        { title: 'Personal mode (browse-only)', subtitle: 'Same screen without actions — switch app to Personal mode to preview', disabled: true },
      ],
    },
    {
      title: 'New design (Figma)',
      rows: [
        { title: 'Premium product page', subtitle: 'New UI/UX — “The Obsidian Kettle”', onPress: () => navigation.navigate('ProductDetailShowcase') },
      ],
    },
    {
      title: 'States',
      rows: [
        { title: 'Loading skeleton', subtitle: 'Full-screen skeleton while loading', onPress: () => setShowSkeleton(true) },
      ],
    },
    {
      title: 'Manage',
      rows: [
        { title: 'Products list', subtitle: 'Catalog / inventory', onPress: () => navigation.navigate('Products') },
        { title: 'Create / edit product', subtitle: 'Add-product form', onPress: () => navigation.navigate('CreateProduct') },
        { title: 'Product search', subtitle: 'Search results', onPress: () => navigation.navigate('ProductsSearch', {}) },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Product Screens"
        leftAction={{
          icon: 'menu',
          onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()),
          accessibilityLabel: 'Open menu',
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: appTheme.colors.textLight }]}>
          Every product screen and viewer state in the app. Tap to open with demo data.
        </Text>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <SectionTitle style={styles.sectionTitle}>{section.title}</SectionTitle>
            <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
              {section.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.title}
                  style={[
                    styles.row,
                    i < section.rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: appTheme.colors.borderColor },
                    row.disabled && styles.rowDisabled,
                  ]}
                  onPress={row.onPress}
                  disabled={row.disabled || !row.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: appTheme.colors.text }]}>{row.title}</Text>
                    {!!row.subtitle && (
                      <Text style={[styles.rowSubtitle, { color: appTheme.colors.textMuted }]}>{row.subtitle}</Text>
                    )}
                  </View>
                  {!row.disabled && (
                    <Icon name="chevron-forward" size={20} color={appTheme.colors.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {showSkeleton && (
        <View style={StyleSheet.absoluteFill}>
          <ProductDetailSkeleton onBack={() => setShowSkeleton(false)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, fontFamily: theme.fonts.primary.regular, marginBottom: 16, lineHeight: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { marginBottom: 12 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowDisabled: { opacity: 0.55 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontFamily: theme.fonts.primary.semiBold },
  rowSubtitle: { fontSize: 13, fontFamily: theme.fonts.primary.regular, marginTop: 2 },
});
