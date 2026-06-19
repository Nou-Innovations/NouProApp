/**
 * BusinessOverviewSection — the analytics block on Business Home.
 *
 * Business+ sees a revenue trend, an orders-by-status donut, and an invoice
 * collection breakdown for the selected period. Free/Pro sees a locked teaser
 * with an Upgrade CTA (the parent opens the PaywallModal). Enterprise can switch
 * the range to 30 days; Business is limited to 7 days.
 *
 * Purely presentational — the screen owns the useBusinessOverview hook.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Skeleton } from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils/format';
import { StatusDonut, type DonutSegment } from '@/features/deliveries/components/charts';
import type { BusinessOverview, OverviewRange } from '@/features/business';
import { RevenueBars } from './RevenueBars';

interface BusinessOverviewSectionProps {
  overview: BusinessOverview | null;
  range: OverviewRange;
  onRangeChange: (range: OverviewRange) => void;
  loading?: boolean;
  error?: string | null;
  /** Free/Pro — show the locked teaser instead of charts. */
  locked?: boolean;
  /** Enterprise — may switch to 30 days. */
  canExtend?: boolean;
  onUpgrade: () => void;
  /** Width available for the revenue chart (already inset for the card). */
  chartWidth: number;
}

export function BusinessOverviewSection({
  overview,
  range,
  onRangeChange,
  loading,
  error,
  locked,
  canExtend,
  onUpgrade,
  chartWidth,
}: BusinessOverviewSectionProps) {
  const { theme: appTheme } = useTheme();

  if (locked) {
    return <BusinessOverviewLocked onUpgrade={onUpgrade} />;
  }

  const cardStyle = [styles.card, { backgroundColor: appTheme.colors.surface }];

  const orderSegments: DonutSegment[] = overview
    ? [
        { label: 'New', value: overview.ordersByStatus.New, color: appTheme.colors.info },
        { label: 'Active', value: overview.ordersByStatus.Active, color: appTheme.colors.accent },
        { label: 'Pending', value: overview.ordersByStatus.Pending, color: appTheme.colors.warning },
        { label: 'Completed', value: overview.ordersByStatus.Completed, color: appTheme.colors.success },
        { label: 'Canceled', value: overview.ordersByStatus.Canceled, color: appTheme.colors.error },
      ]
    : [];
  const totalOrders = orderSegments.reduce((sum, s) => sum + s.value, 0);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>Business Overview</Text>
        <RangeControl range={range} onChange={onRangeChange} canExtend={canExtend} onLockedPress={onUpgrade} />
      </View>

      {loading ? (
        <View style={cardStyle}>
          <Skeleton width={120} height={14} />
          <Skeleton width="100%" height={120} />
        </View>
      ) : error ? (
        <View style={cardStyle}>
          <Text style={[styles.errorText, { color: appTheme.colors.error }]}>
            Couldn’t load analytics.
          </Text>
        </View>
      ) : (
        <>
          {/* Revenue */}
          <View style={cardStyle}>
            <Text style={[styles.cardLabel, { color: appTheme.colors.textSecondary }]}>Revenue</Text>
            <Text style={[styles.cardValue, { color: appTheme.colors.text }]}>
              {formatCurrency(Math.round(overview?.revenueTotal ?? 0))}
            </Text>
            <Text style={[styles.cardCaption, { color: appTheme.colors.textMuted }]}>
              {range === '30d' ? 'Last 30 days' : 'Last 7 days'}
            </Text>
            {overview && overview.revenueTrend.length > 0 ? (
              <RevenueBars points={overview.revenueTrend} width={chartWidth} />
            ) : null}
          </View>

          {/* Orders by status */}
          <View style={cardStyle}>
            <Text style={[styles.cardLabel, { color: appTheme.colors.textSecondary }]}>Orders</Text>
            <View style={styles.donutWrap}>
              <StatusDonut segments={orderSegments} centerValue={totalOrders} centerLabel="Orders" />
            </View>
          </View>

          {/* Invoice collection */}
          <View style={cardStyle}>
            <Text style={[styles.cardLabel, { color: appTheme.colors.textSecondary }]}>
              Invoice collection
            </Text>
            <CollectionRow
              label="Paid"
              amount={overview?.invoiceCollection.paid ?? 0}
              color={appTheme.colors.success}
            />
            <CollectionRow
              label="Unpaid"
              amount={overview?.invoiceCollection.unpaid ?? 0}
              color={appTheme.colors.warning}
            />
            <CollectionRow
              label="Overdue"
              amount={overview?.invoiceCollection.overdue ?? 0}
              color={appTheme.colors.error}
            />
          </View>
        </>
      )}
    </View>
  );
}

function CollectionRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  const { theme: appTheme } = useTheme();
  return (
    <View style={styles.collectionRow}>
      <View style={[styles.collectionDot, { backgroundColor: color }]} />
      <Text style={[styles.collectionLabel, { color: appTheme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.collectionAmount, { color: appTheme.colors.text }]}>
        {formatCurrency(Math.round(amount))}
      </Text>
    </View>
  );
}

function RangeControl({
  range,
  onChange,
  canExtend,
  onLockedPress,
}: {
  range: OverviewRange;
  onChange: (r: OverviewRange) => void;
  canExtend?: boolean;
  onLockedPress: () => void;
}) {
  const { theme: appTheme } = useTheme();
  const options: { key: OverviewRange; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
  ];
  return (
    <View style={[styles.segment, { backgroundColor: appTheme.colors.surface }]}>
      {options.map((opt) => {
        const active = range === opt.key;
        const isLocked = opt.key === '30d' && !canExtend;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segmentItem, active && { backgroundColor: appTheme.colors.accent }]}
            activeOpacity={0.8}
            onPress={() => (isLocked ? onLockedPress() : onChange(opt.key))}
          >
            <Text
              style={[
                styles.segmentText,
                { color: active ? appTheme.colors.textInverse : appTheme.colors.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
            {isLocked ? (
              <Icon
                name="lock-closed"
                size={11}
                color={active ? appTheme.colors.textInverse : appTheme.colors.textMuted}
              />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function BusinessOverviewLocked({ onUpgrade }: { onUpgrade: () => void }) {
  const { theme: appTheme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, styles.lockedSectionTitle, { color: appTheme.colors.text }]}>
        Business Overview
      </Text>
      <View
        style={[styles.lockedCard, { backgroundColor: appTheme.colors.surface }]}
      >
        <View style={[styles.lockedIcon, { backgroundColor: `${appTheme.colors.accent}15` }]}>
          <Icon name="bar-chart" size={22} color={appTheme.colors.accent} />
        </View>
        <Text style={[styles.lockedTitle, { color: appTheme.colors.text }]}>Unlock analytics</Text>
        <Text style={[styles.lockedSubtitle, { color: appTheme.colors.textSecondary }]}>
          See revenue trends, order breakdowns and cash flow. Available on the Business plan and above.
        </Text>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: appTheme.colors.accent }]}
          activeOpacity={0.85}
          onPress={onUpgrade}
        >
          <Icon name="sparkles" size={16} color={appTheme.colors.textInverse} />
          <Text style={[styles.upgradeText, { color: appTheme.colors.textInverse }]}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  lockedSectionTitle: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  card: {
    marginHorizontal: theme.spacing.sm,
    marginBottom: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: 14,
    gap: 4,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.semiBold,
  },
  cardValue: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
  },
  cardCaption: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 6,
  },
  donutWrap: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  collectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  collectionLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  collectionAmount: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Range segmented control
  segment: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Locked teaser
  lockedCard: {
    marginHorizontal: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
  },
  lockedIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  lockedTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.primary.bold,
  },
  lockedSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    lineHeight: 19,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  upgradeText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
});

export default BusinessOverviewSection;
