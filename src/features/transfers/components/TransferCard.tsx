/**
 * TransferCard — summary card for an internal stock transfer between locations.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import Pill from '@/shared/components/ui/Pill';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Transfer, TRANSFER_STATUS_LABELS, TRANSFER_STATUS_COLORS } from '@/shared/types/transfer';

interface TransferCardProps {
  transfer: Transfer;
  onPress?: () => void;
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const TransferCard: React.FC<TransferCardProps> = ({ transfer, onPress }) => {
  const { theme: appTheme } = useTheme();

  const itemCount = transfer.itemCount ?? transfer.items?.length ?? 0;
  const expectedDate = formatDate(transfer.expectedAt);
  const createdDate = formatDate(transfer.createdAt);
  const dateLabel = expectedDate ? `Expected: ${expectedDate}` : createdDate ? `Created: ${createdDate}` : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.locationRow}>
          <Icon name="business-outline" size={16} color={appTheme.colors.textSecondary} />
          <Text style={[styles.locationText, { color: appTheme.colors.text }]} numberOfLines={1}>
            {transfer.fromLocationName || 'Unknown'}
          </Text>
          <Icon name="arrow-forward" size={14} color={appTheme.colors.textSecondary} style={styles.arrow} />
          <Text style={[styles.locationText, { color: appTheme.colors.text }]} numberOfLines={1}>
            {transfer.toLocationName || 'Unknown'}
          </Text>
        </View>
        <Pill text={TRANSFER_STATUS_LABELS[transfer.status]} color={TRANSFER_STATUS_COLORS[transfer.status]} />
      </View>

      <View style={styles.detailRow}>
        <Icon name="cube-outline" size={16} color={appTheme.colors.textSecondary} style={styles.detailIcon} />
        <Text style={[styles.detailText, { color: appTheme.colors.textSecondary }]}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </Text>
        {dateLabel && (
          <Text style={[styles.detailText, styles.dateText, { color: appTheme.colors.textSecondary }]}>
            {dateLabel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 6, padding: 14, borderRadius: 12, borderWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  locationText: { fontSize: 15, fontFamily: 'InterCustom-SemiBold', flexShrink: 1 },
  arrow: { marginHorizontal: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailIcon: { marginRight: theme.spacing.sm },
  detailText: { fontSize: 13, fontFamily: 'InterCustom-Regular' },
  dateText: { marginLeft: 'auto' },
});

export default React.memo(TransferCard);
