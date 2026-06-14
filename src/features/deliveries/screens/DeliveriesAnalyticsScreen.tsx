/**
 * DeliveriesAnalyticsScreen
 *
 * Visual analytics for deliveries & transfers: KPI cards, status donut,
 * on-time gauge, weekly trend, and per-driver / per-location breakdowns.
 * Charts are built on react-native-svg (no chart-library dependency).
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/components/ui';
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
  DeliveryStatus,
} from '@/shared/types/delivery';
import { useDeliveriesAnalytics } from '../hooks/useDeliveriesAnalytics';
import {
  StatusDonut,
  OnTimeGauge,
  WeeklyTrendLine,
  BreakdownBars,
  DonutSegment,
} from '../components/charts';

const STATUS_ORDER: DeliveryStatus[] = [
  'NOT_ASSIGNED',
  'ASSIGNED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'CANCELED',
];

export default function DeliveriesAnalyticsScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const { width } = useWindowDimensions();
  const { data, loading, refreshing, error, refresh } = useDeliveriesAnalytics();

  const chartWidth = width - 64; // screen padding (16*2) + card padding (16*2)

  const donutSegments: DonutSegment[] = useMemo(() => {
    if (!data) return [];
    return STATUS_ORDER.map((status) => ({
      label: DELIVERY_STATUS_LABELS[status],
      value: data.statusBreakdown.find((s) => s.status === status)?.count || 0,
      color: DELIVERY_STATUS_COLORS[status],
    })).filter((s) => s.value > 0);
  }, [data]);

  const kpis = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Total', value: data.summary.total, color: appTheme.colors.text },
      { label: 'Delivered', value: data.summary.delivered, color: appTheme.colors.success },
      { label: 'Active', value: data.summary.active, color: appTheme.colors.info },
      { label: 'Late now', value: data.summary.lateActiveCount, color: appTheme.colors.error },
    ];
  }, [data, appTheme]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <PrimaryHeader
        title="Delivery analytics"
        leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }}
      />

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={appTheme.colors.accent} />
        </View>
      ) : error && !data ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={[styles.retryButton, { backgroundColor: appTheme.colors.primary }]}>
            <Text style={{ color: '#FFFFFF' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !data || data.summary.total === 0 ? (
        <EmptyState
          iconName="bar-chart-outline"
          title="No delivery data yet"
          subtitle="Once you start creating and completing deliveries, your analytics will appear here."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={appTheme.colors.primary} />}
        >
          {/* KPI cards */}
          <View style={styles.kpiGrid}>
            {kpis.map((kpi) => (
              <View
                key={kpi.label}
                style={[styles.kpiCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}
              >
                <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
                <Text style={[styles.kpiLabel, { color: appTheme.colors.textSecondary }]}>{kpi.label}</Text>
              </View>
            ))}
          </View>

          {/* Status breakdown + on-time gauge */}
          <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.cardTitle, { color: appTheme.colors.text }]}>Status breakdown</Text>
            <StatusDonut segments={donutSegments} />
          </View>

          <View style={[styles.card, styles.gaugeCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <OnTimeGauge value={data.summary.onTimeRate} />
            <View style={styles.gaugeStats}>
              <Text style={[styles.gaugeStatValue, { color: appTheme.colors.text }]}>
                {data.summary.avgDeliveryHours}h
              </Text>
              <Text style={[styles.gaugeStatLabel, { color: appTheme.colors.textSecondary }]}>Avg. delivery time</Text>
              <Text style={[styles.gaugeStatValue, { color: appTheme.colors.text, marginTop: 12 }]}>
                {data.summary.failed + data.summary.canceled}
              </Text>
              <Text style={[styles.gaugeStatLabel, { color: appTheme.colors.textSecondary }]}>Failed / canceled</Text>
            </View>
          </View>

          {/* Weekly trend */}
          <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.cardTitle, { color: appTheme.colors.text }]}>Weekly trend</Text>
            <WeeklyTrendLine points={data.weeklyTrend} width={chartWidth} />
          </View>

          {/* Per driver */}
          <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.cardTitle, { color: appTheme.colors.text }]}>By driver</Text>
            <BreakdownBars
              items={data.perDriver.map((d) => ({
                label: d.name,
                value: d.delivered,
                sublabel: `${d.onTimeRate}% on time`,
              }))}
            />
          </View>

          {/* Per location */}
          <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.cardTitle, { color: appTheme.colors.text }]}>By location</Text>
            <BreakdownBars items={data.perLocation.map((l) => ({ label: l.name, value: l.total }))} />
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  kpiValue: {
    fontSize: 26,
    fontFamily: 'InterCustom-Bold',
  },
  kpiLabel: {
    fontSize: 13,
    fontFamily: 'InterCustom-Medium',
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: 'InterCustom-SemiBold',
    marginBottom: 16,
  },
  gaugeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  gaugeStats: {
    alignItems: 'flex-start',
  },
  gaugeStatValue: {
    fontSize: 22,
    fontFamily: 'InterCustom-Bold',
  },
  gaugeStatLabel: {
    fontSize: 12,
    fontFamily: 'InterCustom-Medium',
  },
});
