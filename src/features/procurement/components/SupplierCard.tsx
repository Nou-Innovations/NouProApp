/**
 * SupplierCard Component
 * Displays a supplier in a list format with status pill,
 * contact info, and rating.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Pill from '@/shared/components/ui/Pill';
import { Icon } from '@/shared/utils/icons';
import {
  type Supplier,
  SUPPLIER_STATUS_COLORS,
  SUPPLIER_STATUS_LABELS,
} from '@/shared/types/procurement';

interface SupplierCardProps {
  supplier: Supplier;
  onPress?: () => void;
}

const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, onPress }) => {
  const { theme: appTheme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: appTheme.colors.cardBackground,
          borderBottomColor: appTheme.colors.borderColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header: Name + Status */}
      <View style={styles.header}>
        <Text
          style={[styles.name, { color: appTheme.colors.text }]}
          numberOfLines={1}
        >
          {supplier.name}
        </Text>
        <Pill
          text={SUPPLIER_STATUS_LABELS[supplier.status] || supplier.status}
          color={SUPPLIER_STATUS_COLORS[supplier.status] || appTheme.colors.neutral}
        />
      </View>

      {/* Contact name */}
      {supplier.contactName ? (
        <View style={styles.detailRow}>
          <Icon
            name="person-outline"
            size={16}
            color={appTheme.colors.textSecondary}
            style={styles.detailIcon}
          />
          <Text
            style={[styles.detailText, { color: appTheme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {supplier.contactName}
          </Text>
        </View>
      ) : null}

      {/* Bottom row: Rating + Phone + Email */}
      <View style={styles.bottomRow}>
        {/* Rating */}
        {supplier.rating != null ? (
          <View style={styles.ratingContainer}>
            <Icon
              name="star"
              size={16}
              color={appTheme.colors.warning}
            />
            <Text style={[styles.ratingText, { color: appTheme.colors.text }]}>
              {supplier.rating.toFixed(1)}
            </Text>
          </View>
        ) : null}

        {/* Contact icons */}
        <View style={styles.contactIcons}>
          {supplier.phone ? (
            <Icon
              name="call-outline"
              size={16}
              color={appTheme.colors.textSecondary}
              style={styles.contactIcon}
            />
          ) : null}
          {supplier.email ? (
            <Icon
              name="mail-outline"
              size={16}
              color={appTheme.colors.textSecondary}
              style={styles.contactIcon}
            />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  name: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  detailIcon: {
    marginRight: theme.spacing.sm,
  },
  detailText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
  },
  contactIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  contactIcon: {
    // spacing handled by gap on parent
  },
});

export default React.memo(SupplierCard);
