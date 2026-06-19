/**
 * ClientStoreCard — "In your store" panel shown to a client who ALREADY stocks
 * this distributor's product (viewer mode: client-stocked). Shows their own stock
 * left and order history. When a manageable store copy exists (`canManage`) it
 * exposes a Listed/Unlisted toggle; otherwise it offers "Add to my store" which
 * creates that copy. Reordering is handled by the bottom action bar.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SectionTitle, AppButton } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface Props {
  stockQuantity?: number;
  isLowStock?: boolean;
  lastOrderedAt?: string;
  totalOrdered?: number;
  isListed?: boolean;
  /** True when the client's own product copy exists (enables stock + listing). */
  canManage?: boolean;
  onToggleListing?: (next: boolean) => void;
  onAddToStore?: () => void | Promise<void>;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const ClientStoreCard: React.FC<Props> = ({
  stockQuantity,
  isLowStock,
  lastOrderedAt,
  totalOrdered,
  isListed,
  canManage = false,
  onToggleListing,
  onAddToStore,
}) => {
  const { theme: appTheme } = useTheme();
  const [listed, setListed] = useState(!!isListed);
  const [adding, setAdding] = useState(false);

  const handleToggle = (next: boolean) => {
    setListed(next);
    onToggleListing?.(next);
  };

  const handleAdd = async () => {
    if (!onAddToStore) return;
    setAdding(true);
    try {
      await onAddToStore();
    } finally {
      setAdding(false);
    }
  };

  const lastOrdered = formatDate(lastOrderedAt);

  return (
    <View style={[styles.section, { borderTopColor: appTheme.colors.borderColor }]}>
      <SectionTitle style={styles.title}>In your store</SectionTitle>

      <View style={[styles.card, { backgroundColor: appTheme.colors.surface }]}>
        {/* Stock left */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Stock left</Text>
          <Text
            style={[
              styles.value,
              { color: isLowStock ? appTheme.colors.warning : appTheme.colors.text },
            ]}
          >
            {stockQuantity != null ? `${stockQuantity} units${isLowStock ? ' (Low)' : ''}` : 'Not tracked'}
          </Text>
        </View>

        {/* Order history */}
        {(totalOrdered != null || lastOrdered) && (
          <>
            <View style={[styles.divider, { backgroundColor: appTheme.colors.borderColor }]} />
            <View style={styles.row}>
              <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Ordered</Text>
              <Text style={[styles.value, { color: appTheme.colors.text }]}>
                {totalOrdered != null ? `${totalOrdered} total` : 'Yes'}
                {lastOrdered ? ` · last ${lastOrdered}` : ''}
              </Text>
            </View>
          </>
        )}

        {canManage ? (
          /* Manageable copy exists → listing toggle */
          <>
            <View style={[styles.divider, { backgroundColor: appTheme.colors.borderColor }]} />
            <View style={styles.row}>
              <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Listed in your store</Text>
              <Switch
                value={listed}
                onValueChange={handleToggle}
                trackColor={{ false: appTheme.colors.switchTrackOff, true: appTheme.colors.switchTrackOn }}
                thumbColor={appTheme.colors.switchThumb}
                ios_backgroundColor={appTheme.colors.switchTrackOff}
              />
            </View>
          </>
        ) : (
          /* No copy yet → offer to add it to the client's store */
          <View style={styles.addBlock}>
            <View style={[styles.divider, { backgroundColor: appTheme.colors.borderColor }]} />
            <Text style={[styles.addHint, { color: appTheme.colors.textMuted }]}>
              Add it to your store to track stock and list it for your customers.
            </Text>
            <AppButton
              title="Add to my store"
              variant="primary"
              size="small"
              loading={adding}
              onPress={handleAdd}
            />
          </View>
        )}
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
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  addBlock: {
    paddingVertical: 14,
    gap: 12,
  },
  addHint: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 18,
  },
});

export default ClientStoreCard;
