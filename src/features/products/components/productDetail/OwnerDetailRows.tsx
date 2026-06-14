/**
 * OwnerDetailRows — restyled product internals shown only to the product owner:
 * SKU, barcode, stock, RRP limit, tax, supplier, and linked supplier pricing.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import {
  ProductCore,
  ProductPricing,
  ProductAvailability,
  formatPrice,
} from '@/shared/types/productDetails';
import type { ProductSupplierPricing } from '@/features/procurement/services/procurement.service';

interface Props {
  product: ProductCore;
  pricing: ProductPricing;
  availability: ProductAvailability;
  supplierPricing: ProductSupplierPricing[];
}

const OwnerDetailRows: React.FC<Props> = ({ product, pricing, availability, supplierPricing }) => {
  const { theme: appTheme } = useTheme();

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.row}>
      <Text style={[styles.label, { color: appTheme.colors.textMuted }]}>{label}</Text>
      <View style={styles.valueWrap}>{children}</View>
    </View>
  );

  return (
    <View style={[styles.section, { borderTopColor: appTheme.colors.borderColor }]}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>Details</Text>

      {product.sku && (
        <Row label="SKU">
          <Text style={[styles.value, { color: appTheme.colors.text }]}>{product.sku}</Text>
        </Row>
      )}

      {product.barcode && (
        <Row label="Barcode">
          <View style={styles.inline}>
            <Icon name="barcode-outline" size={16} color={appTheme.colors.text} />
            <Text style={[styles.value, { color: appTheme.colors.text }]}>{product.barcode}</Text>
          </View>
        </Row>
      )}

      {availability.stockQuantity !== undefined && (
        <Row label="In stock">
          <Text
            style={[
              styles.value,
              { color: availability.isLowStock ? appTheme.colors.warning : appTheme.colors.text },
            ]}
          >
            {availability.stockQuantity} units{availability.isLowStock ? ' (Low)' : ''}
          </Text>
        </Row>
      )}

      {product.hasRetailPriceLimit && pricing.retailPriceLimit !== undefined && (
        <Row label="RRP limit">
          <Text style={[styles.value, { color: appTheme.colors.text }]}>
            {formatPrice(pricing.retailPriceLimit, pricing.currency)}
          </Text>
        </Row>
      )}

      {pricing.taxRate !== undefined && (
        <Row label="Tax">
          <Text style={[styles.value, { color: appTheme.colors.text }]}>{pricing.taxRate}%</Text>
        </Row>
      )}

      {product.supplier && (
        <Row label="Supplier">
          <Text style={[styles.value, { color: appTheme.colors.text }]}>{product.supplier}</Text>
        </Row>
      )}

      {supplierPricing.length > 0 && (
        <View style={styles.supplierBlock}>
          <Text style={[styles.supplierTitle, { color: appTheme.colors.text }]}>Supplier pricing</Text>
          {supplierPricing.map((sp, index) => (
            <View
              key={sp.supplierId}
              style={[
                styles.supplierCard,
                {
                  backgroundColor: appTheme.colors.surface,
                  borderBottomColor: appTheme.colors.borderColor,
                  borderBottomWidth: index < supplierPricing.length - 1 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <View style={styles.supplierHeader}>
                <Text style={[styles.supplierName, { color: appTheme.colors.text }]} numberOfLines={1}>
                  {sp.supplierName}
                </Text>
                <Text style={[styles.supplierPrice, { color: appTheme.colors.success }]}>
                  {formatPrice(sp.supplierPrice, pricing.currency)}/unit
                </Text>
              </View>
              <View style={styles.supplierMeta}>
                {sp.minOrderQty != null && (
                  <Text style={[styles.supplierMetaText, { color: appTheme.colors.textSecondary }]}>
                    Min: {sp.minOrderQty}
                  </Text>
                )}
                {sp.leadTimeDays != null && (
                  <Text style={[styles.supplierMetaText, { color: appTheme.colors.textSecondary }]}>
                    Lead: {sp.leadTimeDays} days
                  </Text>
                )}
                {sp.supplierSKU && (
                  <Text style={[styles.supplierMetaText, { color: appTheme.colors.textSecondary }]}>
                    SKU: {sp.supplierSKU}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
    width: 90,
  },
  valueWrap: {
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supplierBlock: {
    marginTop: 8,
  },
  supplierTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 10,
  },
  supplierCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  supplierName: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  supplierPrice: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  supplierMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  supplierMetaText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
  },
});

export default OwnerDetailRows;
