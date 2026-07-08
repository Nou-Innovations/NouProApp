/**
 * BusinessAnalyticsScreen — the deep-dive analytics screen (sidebar → Business → Analytics).
 * Revenue trend, orders mix, cash collection, top products & top customers, with a
 * 7d/30d range (30d = Enterprise). Business+ only; Free/Pro see an upgrade teaser.
 * Reuses the existing SVG charts (RevenueBars, StatusDonut, BreakdownBars).
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState, TextButton } from '@/shared/components/ui';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { formatCurrency } from '@/shared/utils/format';
import { RevenueBars } from '@/modes/business/components';
import { StatusDonut, BreakdownBars, DonutSegment } from '@/features/deliveries/components/charts';
import { useBusinessAnalytics } from '../hooks/useBusinessAnalytics';

export default function BusinessAnalyticsScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const c = appTheme.colors;
  const { width } = useWindowDimensions();
  const { analyticsType } = usePermissions();
  const { data, loading, refreshing, error, refresh, range, setRange } = useBusinessAnalytics();

  const chartWidth = width - 64;
  const canExtend = analyticsType === 'full';
  const locked = analyticsType === 'none';

  const orderSegments: DonutSegment[] = useMemo(() => {
    if (!data) return [];
    const s = data.ordersByStatus;
    return [
      { label: 'New', value: s.New, color: c.info },
      { label: 'Active', value: s.Active, color: c.accent },
      { label: 'Pending', value: s.Pending, color: c.warning },
      { label: 'Completed', value: s.Completed, color: c.success },
      { label: 'Canceled', value: s.Canceled, color: c.textMuted },
    ].filter((x) => x.value > 0);
  }, [data, c]);

  const kpis = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Revenue', value: formatCurrency(data.revenueTotal), color: c.text },
      { label: 'Orders', value: String(data.orderCount), color: c.info },
      { label: 'Avg order', value: formatCurrency(data.avgOrderValue), color: c.text },
      { label: 'Collected', value: `${data.collectionRate}%`, color: c.success },
    ];
  }, [data, c]);

  const header = (
    <SecondaryHeader
      title="Analytics"
      leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
    />
  );

  if (locked) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: c.background }]} edges={['top']}>
        {header}
        <EmptyState
          iconName="bar-chart-outline"
          title="Analytics is a Business feature"
          subtitle="Upgrade to the Business plan to see revenue trends, your top products and customers, and cash collection."
          ctaLabel="See plans"
          onCtaPress={() => navigation.navigate('SubscriptionHub')}
        />
      </SafeAreaView>
    );
  }

  const Chip = ({ label, active, disabled, onPress }: { label: string; active: boolean; disabled?: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.7}
      style={[styles.chip, { backgroundColor: active ? c.primary : c.cardBackground, borderColor: active ? c.primary : c.borderColor, opacity: disabled ? 0.45 : 1 }]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : c.text }]}>{label}{disabled ? ' 🔒' : ''}</Text>
    </TouchableOpacity>
  );

  const card = (title: string, child: React.ReactNode) => (
    <View style={[styles.card, { backgroundColor: c.cardBackground, borderColor: c.borderColor }]}>
      <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text>
      {child}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.background }]} edges={['top']}>
      {header}
      {loading && !data ? (
        <View style={styles.center}><ActivityIndicator color={c.accent} /></View>
      ) : error && !data ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
          <TextButton title="Retry" onPress={refresh} />
        </View>
      ) : !data || (data.revenueTotal === 0 && data.orderCount === 0) ? (
        <EmptyState
          iconName="bar-chart-outline"
          title="No sales data yet"
          subtitle="Once you start taking orders and sending invoices, your analytics will appear here."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
        >
          {/* Range */}
          <View style={styles.rangeRow}>
            <Chip label="7 days" active={range === '7d'} onPress={() => setRange('7d')} />
            <Chip label="30 days" active={range === '30d'} disabled={!canExtend} onPress={() => setRange('30d')} />
          </View>

          {/* KPI grid */}
          <View style={styles.kpiGrid}>
            {kpis.map((kpi) => (
              <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: c.cardBackground, borderColor: c.borderColor }]}>
                <Text style={[styles.kpiValue, { color: kpi.color }]} numberOfLines={1}>{kpi.value}</Text>
                <Text style={[styles.kpiLabel, { color: c.textSecondary }]}>{kpi.label}</Text>
              </View>
            ))}
          </View>

          {card('Revenue', <RevenueBars points={data.revenueTrend} width={chartWidth} />)}

          {orderSegments.length > 0 && card('Orders', <StatusDonut segments={orderSegments} />)}

          {card('Invoice collection', (
            <View style={{ gap: 10 }}>
              {([
                ['Paid', data.invoiceCollection.paid, c.success],
                ['Unpaid', data.invoiceCollection.unpaid, c.warning],
                ['Overdue', data.invoiceCollection.overdue, c.error],
              ] as const).map(([label, amount, dot]) => (
                <View key={label} style={styles.collectionRow}>
                  <View style={styles.collectionLeft}>
                    <View style={[styles.dot, { backgroundColor: dot }]} />
                    <Text style={{ color: c.textSecondary, fontSize: 14 }}>{label}</Text>
                  </View>
                  <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{formatCurrency(amount)}</Text>
                </View>
              ))}
            </View>
          ))}

          {data.topProducts.length > 0 && card('Top products', <BreakdownBars items={data.topProducts.map((p) => ({ label: p.label, value: p.value }))} />)}

          {data.topCustomers.length > 0 && card('Top customers', <BreakdownBars items={data.topCustomers.map((p) => ({ label: p.label, value: p.value }))} />)}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  scrollContent: { padding: 16, gap: 12 },
  rangeRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 16 },
  kpiValue: { fontSize: 24, fontFamily: 'InterCustom-Bold' },
  kpiLabel: { fontSize: 13, fontFamily: 'InterCustom-Medium', marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 17, fontFamily: 'InterCustom-SemiBold', marginBottom: 16 },
  collectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
