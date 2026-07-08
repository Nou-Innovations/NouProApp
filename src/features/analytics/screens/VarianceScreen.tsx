/**
 * VarianceScreen — three views of "how are we doing vs expectations":
 *  • Targets  — this month's revenue/orders vs the budget you set (over/under gauge)
 *  • vs Last  — this month vs last month (▲▼ % change)
 *  • Margin   — revenue / COGS / gross margin + discount leakage (uses product cost)
 * Business+ only. Backed by analytics.service (/variance + /targets).
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState, TextButton, AppButton } from '@/shared/components/ui';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { formatCurrency } from '@/shared/utils/format';
import { OnTimeGauge } from '@/features/deliveries/components/charts';
import { useVariance } from '../hooks/useBusinessAnalytics';
import { DeltaBlock } from '../analytics.service';

type Segment = 'targets' | 'period' | 'margin';

export default function VarianceScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const c = appTheme.colors;
  const { analyticsType } = usePermissions();
  const { data, loading, refreshing, error, refresh } = useVariance();
  const [segment, setSegment] = useState<Segment>('targets');
  const locked = analyticsType === 'none';

  // Refresh on focus so returning from "Set targets" reflects the new goals.
  useFocusEffect(React.useCallback(() => { refresh(); }, [refresh]));

  const header = (
    <SecondaryHeader
      title="Variance"
      leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
    />
  );

  if (locked) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
        {header}
        <EmptyState
          iconName="pie-chart-outline"
          title="Variance is a Business feature"
          subtitle="Upgrade to the Business plan to set monthly targets and track budget, trend and margin variance."
          ctaLabel="See plans"
          onCtaPress={() => navigation.navigate('SubscriptionHub')}
        />
      </SafeAreaView>
    );
  }

  const Chip = ({ label, seg }: { label: string; seg: Segment }) => (
    <TouchableOpacity
      onPress={() => setSegment(seg)}
      activeOpacity={0.7}
      style={[styles.chip, { backgroundColor: segment === seg ? c.primary : c.cardBackground, borderColor: segment === seg ? c.primary : c.borderColor }]}
    >
      <Text style={[styles.chipText, { color: segment === seg ? '#FFFFFF' : c.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  const card = (child: React.ReactNode, title?: string) => (
    <View style={[styles.card, { backgroundColor: c.cardBackground, borderColor: c.borderColor }]}>
      {title ? <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text> : null}
      {child}
    </View>
  );

  const stat = (label: string, value: string, color?: string) => (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: color || c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
    </View>
  );

  const deltaRow = (label: string, block: DeltaBlock, currency: boolean) => {
    const up = block.changePct >= 0;
    return (
      <View style={styles.cmpRow} key={label}>
        <Text style={{ color: c.text, fontSize: 15 }}>{label}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>
            {currency ? formatCurrency(block.current) : block.current}
          </Text>
          <Text style={{ color: up ? c.success : c.error, fontSize: 12 }}>
            {up ? '▲' : '▼'} {Math.abs(block.changePct)}% vs {currency ? formatCurrency(block.previous) : block.previous}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      {header}
      {loading && !data ? (
        <View style={styles.center}><ActivityIndicator color={c.accent} /></View>
      ) : error && !data ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
          <TextButton title="Retry" onPress={refresh} />
        </View>
      ) : !data ? null : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
        >
          <View style={styles.segRow}>
            <Chip label="Targets" seg="targets" />
            <Chip label="vs Last" seg="period" />
            <Chip label="Margin" seg="margin" />
          </View>

          {segment === 'targets' && (
            <>
              {data.budget.revenueTarget || data.budget.ordersTarget ? (
                <>
                  {data.budget.revenueTarget ? card(
                    <View style={styles.gaugeWrap}>
                      <OnTimeGauge value={data.budget.revenuePct ?? 0} label="of revenue goal" color={c.accent} />
                      <View style={styles.statsCol}>
                        {stat('Actual', formatCurrency(data.budget.actualRevenue))}
                        {stat('Target', formatCurrency(data.budget.revenueTarget))}
                      </View>
                    </View>,
                    'Revenue vs target',
                  ) : null}
                  {data.budget.ordersTarget ? card(
                    <View style={styles.gaugeWrap}>
                      <OnTimeGauge value={data.budget.ordersPct ?? 0} label="of orders goal" color={c.info} />
                      <View style={styles.statsCol}>
                        {stat('Actual', String(data.budget.actualOrders))}
                        {stat('Target', String(data.budget.ordersTarget))}
                      </View>
                    </View>,
                    'Orders vs target',
                  ) : null}
                  <AppButton title="Edit targets" variant="secondary" onPress={() => navigation.navigate('SetTargets', { period: data.period })} />
                </>
              ) : (
                <EmptyState
                  iconName="flag-outline"
                  title="No targets set for this month"
                  subtitle="Set a revenue or orders goal to track how you're pacing against it."
                  ctaLabel="Set targets"
                  onCtaPress={() => navigation.navigate('SetTargets', { period: data.period })}
                />
              )}
            </>
          )}

          {segment === 'period' && card(
            <View style={{ gap: 14 }}>
              {deltaRow('Revenue', data.periodOverPeriod.revenue, true)}
              {deltaRow('Orders', data.periodOverPeriod.orders, false)}
              {deltaRow('Collected', data.periodOverPeriod.collected, true)}
            </View>,
            'This month vs last month',
          )}

          {segment === 'margin' && (
            <>
              {card(
                <View style={styles.gaugeWrap}>
                  <OnTimeGauge value={data.margin.marginPct ?? 0} label="gross margin" color={c.success} />
                  <View style={styles.statsCol}>
                    {stat('Revenue', formatCurrency(data.margin.costedRevenue))}
                    {stat('Cost (COGS)', formatCurrency(data.margin.cogs))}
                    {stat('Gross margin', formatCurrency(data.margin.grossMargin), c.success)}
                  </View>
                </View>,
                'Estimated margin',
              )}
              {card(
                <View style={{ gap: 8 }}>
                  <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                    Margin given up vs selling at list price (discounts, price lists, promotions):
                  </Text>
                  <Text style={{ color: c.error, fontSize: 22, fontFamily: 'InterCustom-Bold' }}>
                    {formatCurrency(data.margin.leakage)}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                    Based on current product cost; excludes items with no cost set.
                  </Text>
                </View>,
                'Discount leakage',
              )}
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  scrollContent: { padding: 16, gap: 12 },
  segRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, paddingVertical: 9, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 17, fontFamily: 'InterCustom-SemiBold', marginBottom: 16 },
  gaugeWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statsCol: { gap: 10 },
  statBlock: {},
  statValue: { fontSize: 18, fontFamily: 'InterCustom-Bold' },
  statLabel: { fontSize: 12, fontFamily: 'InterCustom-Medium' },
  cmpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
