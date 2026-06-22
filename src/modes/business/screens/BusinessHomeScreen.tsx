/**
 * BusinessHomeScreen - Business Mode Home / Command Center
 *
 * The Business mode landing screen. Answers, at a glance: how is the business
 * doing, what needs attention, how is it performing, and what to do next.
 * Composes:
 * - Header: business name + date + location selector + notifications
 * - Business Health card (Good / Needs attention / Critical)
 * - KPI grid (Sales Today, Active Orders, Deliveries Today, Unpaid Invoices)
 * - Needs Attention (priority queue)
 * - Business Overview analytics (revenue, orders, invoice collection) — Business+
 * - Quick Actions (permission-gated create flows)
 * - Recent Activity preview ("See all" → Activities log)
 *
 * Data comes from useBusinessDashboard (always) and useBusinessOverview (lazy,
 * Business+ only). Location scoping flows through the shared businessStore.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@/shared/utils/icons';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { EmptyState } from '@/shared/components/ui';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useBusinessStore } from '@/shared/store/businessStore';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { RootStackParamList } from '@/shared/types/navigation';
import {
  BusinessHealthCard,
  KpiGrid,
  ProPriorityQueue,
  ProQuickActions,
  ProRecentActivity,
  BusinessOverviewSection,
  LocationSelectorPill,
} from '../components';
import { useBusinessDashboard } from '../hooks/useBusinessDashboard';
import { useBusinessOverview } from '../hooks/useBusinessOverview';

const CHART_WIDTH = Dimensions.get('window').width - (theme.spacing.sm + theme.spacing.md) * 2;

export default function BusinessHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();
  const currentLocationId = useBusinessStore((s) => s.currentLocationId);
  const locationCount = useBusinessStore((s) => s.locations.length);
  // Single-location businesses are always business-wide; multi-location only when "All".
  const isBusinessWide = locationCount < 2 || currentLocationId === null;
  const { analyticsType } = usePermissions();

  const {
    health,
    kpiCards,
    priorityItems,
    quickActions,
    recentActivity,
    summary,
    loading,
    refreshing,
    error,
    refresh,
  } = useBusinessDashboard();

  // Analytics block is Business+; Enterprise ("full") may extend to 30 days.
  const analyticsLocked = analyticsType === 'none';
  const canExtendRange = analyticsType === 'full';
  const {
    overview,
    range,
    setRange,
    loading: overviewLoading,
    error: overviewError,
  } = useBusinessOverview({ enabled: !analyticsLocked });

  const [showPaywall, setShowPaywall] = useState(false);

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  }, [navigation]);

  const goToActivities = useCallback(() => {
    navigation.navigate('AllActivity');
  }, [navigation]);

  // A brand-new business: no activity at all → show a setup prompt instead of
  // an empty (and misleadingly "healthy") dashboard.
  //
  // Only when viewing ALL locations and the data has fully settled. A single
  // location (e.g. a dependent branch) legitimately has zero of its own
  // activity — that must show a zeroed dashboard, NOT the setup screen, and we
  // must not flip to it mid-refetch (which caused the dashboard→setup flicker).
  const isNewBusiness =
    isBusinessWide &&
    !loading &&
    !refreshing &&
    !error &&
    summary != null &&
    summary.activeOrders === 0 &&
    summary.newOrders === 0 &&
    summary.deliveriesToday === 0 &&
    summary.unpaidInvoices === 0 &&
    Math.round(summary.salesToday) === 0 &&
    recentActivity.length === 0 &&
    priorityItems.length === 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {/* Fixed Header */}
      <PrimaryHeader
        title="Analytics"
        leftAction={{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }}
      />
      <View style={styles.locationRow}>
        <LocationSelectorPill />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={appTheme.colors.primary}
          />
        }
      >
        {/* Error banner with retry */}
        {error && !loading && (
          <TouchableOpacity
            style={[styles.errorBanner, { backgroundColor: appTheme.colors.error }]}
            onPress={refresh}
            activeOpacity={0.8}
          >
            <Icon name="refresh-outline" size={16} color={appTheme.colors.textInverse} />
            <Text style={styles.errorText}>Couldn't load dashboard. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {isNewBusiness ? (
          <EmptyState
            title="Set up your business"
            subtitle="Add your first product to start receiving orders, creating invoices and tracking performance."
            iconName="cube-outline"
            ctaLabel="Add your first product"
            onCtaPress={() => navigation.navigate('CreateProduct', {})}
          />
        ) : (
          <>
            {/* Business health */}
            <BusinessHealthCard health={health} isLoading={loading} />

            {/* KPI grid */}
            <KpiGrid cards={kpiCards} isLoading={loading} />

            {/* Quick actions */}
            <ProQuickActions actions={quickActions} isLoading={loading} />

            {/* Needs attention */}
            <ProPriorityQueue items={priorityItems} isLoading={loading} onSeeAll={goToActivities} />

            {/* Business overview analytics (Business+ / locked teaser for Free·Pro) */}
            <BusinessOverviewSection
              overview={overview}
              range={range}
              onRangeChange={setRange}
              loading={overviewLoading}
              error={overviewError}
              locked={analyticsLocked}
              canExtend={canExtendRange}
              onUpgrade={() => setShowPaywall(true)}
              chartWidth={CHART_WIDTH}
            />

            {/* Recent activity preview */}
            <ProRecentActivity
              items={recentActivity}
              isLoading={loading}
              onSeeAll={goToActivities}
            />
          </>
        )}
      </ScrollView>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          navigation.navigate('SubscriptionPlans');
        }}
        requiredPlan="business"
        modalType="feature_gate"
        title="Unlock analytics"
        description="See revenue trends, order breakdowns and cash flow with the Business plan."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationRow: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scrollContent: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
    gap: 22,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  errorText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
