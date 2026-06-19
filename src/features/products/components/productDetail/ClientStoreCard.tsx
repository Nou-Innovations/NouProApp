/**
 * ClientStoreCard — "In your store" panel shown to a client who ALREADY stocks
 * this distributor's product (viewer mode: client-stocked). Shows their own stock
 * left and a Listed/Unlisted toggle for their store. Reordering is handled by the
 * bottom action bar (the "Reorder" button).
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SectionTitle } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface Props {
  stockQuantity?: number;
  isLowStock?: boolean;
  isListed?: boolean;
  /** False when the client's own product id isn't available yet (data pending). */
  canManage?: boolean;
  onToggleListing?: (next: boolean) => void;
}

const ClientStoreCard: React.FC<Props> = ({
  stockQuantity,
  isLowStock,
  isListed,
  canManage = false,
  onToggleListing,
}) => {
  const { theme: appTheme } = useTheme();
  const [listed, setListed] = useState(!!isListed);

  const handleToggle = (next: boolean) => {
    setListed(next);
    onToggleListing?.(next);
  };

  return (
    <View style={[styles.section, { borderTopColor: appTheme.colors.borderColor }]}>
      <SectionTitle style={styles.title}>In your store</SectionTitle>

      <View style={[styles.card, { backgroundColor: appTheme.colors.surface }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Stock left</Text>
          <Text
            style={[
              styles.value,
              { color: isLowStock ? appTheme.colors.warning : appTheme.colors.text },
            ]}
          >
            {stockQuantity != null ? `${stockQuantity} units${isLowStock ? ' (Low)' : ''}` : '—'}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: appTheme.colors.borderColor }]} />

        <View style={styles.row}>
          <View style={styles.labelWrap}>
            <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Listed in your store</Text>
            {!canManage && (
              <Text style={[styles.hint, { color: appTheme.colors.textMuted }]}>Available once linked</Text>
            )}
          </View>
          <Switch
            value={listed}
            onValueChange={handleToggle}
            disabled={!canManage}
            trackColor={{ false: appTheme.colors.switchTrackOff, true: appTheme.colors.switchTrackOn }}
            thumbColor={appTheme.colors.switchThumb}
            ios_backgroundColor={appTheme.colors.switchTrackOff}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  title: {
    marginBottom: 14,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  labelWrap: {
    flexShrink: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  hint: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  value: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});

export default ClientStoreCard;
