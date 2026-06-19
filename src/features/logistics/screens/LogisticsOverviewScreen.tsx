/**
 * LogisticsOverviewScreen — the Logistics command center.
 * Shows what needs attention across deliveries, transfers and issues, plus
 * quick actions. The landing screen for the Logistics module.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/utils/icons';
import { SectionTitle } from '@/shared/components/ui';
import { useDeliveries } from '@/features/deliveries/hooks/useDeliveries';
import { useTransfers } from '@/features/transfers/hooks/useTransfers';
import { useIssues } from '@/features/issues/hooks/useIssues';
import { isDeliveryActive } from '@/shared/utils/deliverySla';

export default function LogisticsOverviewScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const nav = navigation as any;

  const deliveries = useDeliveries();
  const transfers = useTransfers();
  const issues = useIssues();

  const inTransit = useMemo(
    () => deliveries.deliveries.filter((d) => d.deliveryStatus === 'InTransit').length,
    [deliveries.deliveries]
  );
  const activeDeliveries = useMemo(
    () => deliveries.deliveries.filter(isDeliveryActive).length,
    [deliveries.deliveries]
  );

  const refreshing = deliveries.refreshing || transfers.refreshing || issues.refreshing;
  const onRefresh = () => { deliveries.refresh(); transfers.refresh(); issues.refresh(); };

  const kpis = [
    { label: 'Needs attention', value: deliveries.needsAttentionCount, color: appTheme.colors.error, onPress: () => nav.navigate('Deliveries', { segment: 'needs_attention' }) },
    { label: 'In transit', value: inTransit, color: appTheme.colors.info, onPress: () => nav.navigate('Deliveries', { segment: 'outgoing' }) },
    { label: 'Active', value: activeDeliveries, color: appTheme.colors.text, onPress: () => nav.navigate('Deliveries') },
    { label: 'Transfer requests', value: transfers.requestsCount, color: appTheme.colors.warning, onPress: () => nav.navigate('Transfers', { segment: 'requests' }) },
    { label: 'To receive', value: transfers.toReceiveCount, color: appTheme.colors.info, onPress: () => nav.navigate('Transfers', { segment: 'to_receive' }) },
    { label: 'Open issues', value: issues.openCount, color: appTheme.colors.error, onPress: () => nav.navigate('Issues') },
  ];

  const quickActions = [
    { label: 'New delivery', icon: 'add-circle-outline', onPress: () => nav.navigate('CreateDelivery', { mode: 'delivery' }) },
    { label: 'New transfer', icon: 'swap-horizontal-outline', onPress: () => nav.navigate('Transfers') },
    { label: 'Analytics', icon: 'bar-chart-outline', onPress: () => nav.navigate('DeliveriesAnalytics') },
    { label: 'Routes', icon: 'map-outline', onPress: () => nav.navigate('Routes') },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <PrimaryHeader
        title="Logistics"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={appTheme.colors.primary} />}
      >
        <SectionTitle style={{ marginTop: 12, marginBottom: 8 }}>Overview</SectionTitle>
        <View style={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <TouchableOpacity
              key={kpi.label}
              style={[styles.kpiCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}
              onPress={kpi.onPress}
            >
              <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              <Text style={[styles.kpiLabel, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>{kpi.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle style={{ marginTop: 12, marginBottom: 8 }}>Quick actions</SectionTitle>
        <View style={styles.actionsRow}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}
              onPress={a.onPress}
            >
              <Icon name={a.icon} size={22} color={appTheme.colors.accent} />
              <Text style={[styles.actionLabel, { color: appTheme.colors.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle style={{ marginTop: 12, marginBottom: 8 }}>Jump to</SectionTitle>
        <View style={[styles.linkCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          {[
            { label: 'All deliveries', icon: 'truck-outline', route: 'Deliveries' },
            { label: 'Transfers', icon: 'swap-horizontal-outline', route: 'Transfers' },
            { label: 'My deliveries', icon: 'person-outline', route: 'MyDeliveries' },
            { label: 'Issues', icon: 'alert-circle-outline', route: 'Issues' },
            { label: 'Returns', icon: 'arrow-undo-outline', route: 'Returns' },
            { label: 'Routes', icon: 'map-outline', route: 'Routes' },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.route}
              style={[styles.linkRow, i < arr.length - 1 && { borderBottomColor: appTheme.colors.borderColor, borderBottomWidth: 1 }]}
              onPress={() => nav.navigate(row.route)}
            >
              <Icon name={row.icon} size={20} color={appTheme.colors.textSecondary} />
              <Text style={[styles.linkLabel, { color: appTheme.colors.text }]}>{row.label}</Text>
              <Icon name="chevron-forward" size={18} color={appTheme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 16 },
  kpiValue: { fontSize: 26, fontFamily: 'InterCustom-Bold' },
  kpiLabel: { fontSize: 13, fontFamily: 'InterCustom-Medium', marginTop: 2 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  actionLabel: { fontSize: 15, fontFamily: 'InterCustom-SemiBold' },
  linkCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  linkLabel: { flex: 1, fontSize: 15, fontFamily: 'InterCustom-Medium' },
});
