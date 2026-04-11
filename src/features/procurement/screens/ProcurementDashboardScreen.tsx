/**
 * ProcurementDashboardScreen
 *
 * Hub screen showing procurement stats, quick actions,
 * recent POs, pending PRs, and suppliers overview.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import { Icon } from '@/shared/utils/icons';
import { Skeleton, SkeletonRow, SkeletonColumn } from '@/shared/components/ui';
import { canCreateProcurementOrders, checkPaywall, PaywallCheck } from '@/shared/utils/permissions';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';
import { usePurchaseRequests } from '../hooks/usePurchaseRequests';
import { useSuppliers } from '../hooks/useSuppliers';
import {
  useProcurementStore,
  selectOpenPRCount,
  selectActivePOCount,
  selectAwaitingReceiptCount,
} from '../store/procurement.store';
import SupplierCard from '../components/SupplierCard';
import ProcurementStatusBadge from '../components/ProcurementStatusBadge';
import type { PurchaseOrder, PurchaseRequest, Supplier } from '@/shared/types/procurement';

export default function ProcurementDashboardScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);

  // Paywall
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallCheck, setPaywallCheck] = useState<PaywallCheck | null>(null);
  const planAllows = canCreateProcurementOrders(activeBusiness?.plan || null);

  // Data hooks
  const {
    purchaseOrders,
    loading: poLoading,
    refreshing: poRefreshing,
    refresh: refreshPOs,
  } = usePurchaseOrders();

  const {
    purchaseRequests,
    loading: prLoading,
    refreshing: prRefreshing,
    refresh: refreshPRs,
  } = usePurchaseRequests();

  const {
    suppliers,
    loading: suppliersLoading,
    refreshing: suppliersRefreshing,
    refresh: refreshSuppliers,
  } = useSuppliers();

  // Stats from store selectors
  const openPRCount = useProcurementStore(selectOpenPRCount);
  const activePOCount = useProcurementStore(selectActivePOCount);
  const awaitingReceiptCount = useProcurementStore(selectAwaitingReceiptCount);

  const loading = poLoading || prLoading || suppliersLoading;
  const refreshing = poRefreshing || prRefreshing || suppliersRefreshing;

  const handleRefresh = useCallback(() => {
    refreshPOs();
    refreshPRs();
    refreshSuppliers();
  }, [refreshPOs, refreshPRs, refreshSuppliers]);

  const handleQuickAction = useCallback(
    (screen: string) => {
      if (!planAllows) {
        const check = checkPaywall('create_procurement_order', activeBusiness?.plan || null);
        if (!check.allowed) {
          setPaywallCheck(check);
          setShowPaywall(true);
          return;
        }
      }
      (navigation as any).navigate(screen);
    },
    [navigation, planAllows, activeBusiness],
  );

  // Recent items (max 3)
  const recentPOs = purchaseOrders.slice(0, 3);
  const pendingPRs = purchaseRequests.slice(0, 3);
  const recentSuppliers = suppliers.slice(0, 3);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title="Procurement"
        leftAction={{
          icon: 'chevron-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Go back',
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={appTheme.colors.primary}
          />
        }
      >
        {/* ── Stat Cards ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.statValue, { color: appTheme.colors.text }]}>
              {loading ? '–' : openPRCount}
            </Text>
            <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>
              Open PRs
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.statValue, { color: appTheme.colors.text }]}>
              {loading ? '–' : activePOCount}
            </Text>
            <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>
              Active POs
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.statValue, { color: appTheme.colors.text }]}>
              {loading ? '–' : awaitingReceiptCount}
            </Text>
            <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>
              Awaiting Receipt
            </Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: appTheme.colors.primary }]}
            onPress={() => handleQuickAction('CreatePurchaseRequest')}
            activeOpacity={0.7}
          >
            <Icon name="document-text-outline" size={20} color={appTheme.colors.textInverse} />
            <Text style={[styles.quickActionText, { color: appTheme.colors.textInverse }]}>
              New Request
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: appTheme.colors.primary }]}
            onPress={() => handleQuickAction('CreatePurchaseOrder')}
            activeOpacity={0.7}
          >
            <Icon name="cart-outline" size={20} color={appTheme.colors.textInverse} />
            <Text style={[styles.quickActionText, { color: appTheme.colors.textInverse }]}>
              New PO
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent Purchase Orders ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
              Recent Purchase Orders
            </Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('PurchaseOrders')}>
              <Text style={[styles.viewAllText, { color: appTheme.colors.info }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.skeletonSection}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.skeletonCard, { backgroundColor: appTheme.colors.cardBackground }]}
                >
                  <SkeletonRow gap={12}>
                    <Skeleton width={40} height={40} borderRadius={8} />
                    <SkeletonColumn gap={6} style={{ flex: 1 }}>
                      <Skeleton width="60%" height={14} />
                      <Skeleton width="40%" height={12} />
                    </SkeletonColumn>
                    <Skeleton width={70} height={24} borderRadius={12} />
                  </SkeletonRow>
                </View>
              ))}
            </View>
          ) : recentPOs.length === 0 ? (
            <Text style={[styles.emptyText, { color: appTheme.colors.textMuted }]}>
              No purchase orders yet
            </Text>
          ) : (
            recentPOs.map((po) => (
              <TouchableOpacity
                key={po.id}
                style={[styles.listItem, { borderBottomColor: appTheme.colors.borderColor }]}
                onPress={() => (navigation as any).navigate('PurchaseOrderDetail', { orderId: po.id })}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listItemTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
                    {po.poNumber || po.id.slice(0, 8)}
                  </Text>
                  <Text style={[styles.listItemSubtitle, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
                    {po.supplier?.name || 'No supplier'}
                  </Text>
                </View>
                <ProcurementStatusBadge status={po.status} type="po" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── Pending Requests ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
              Pending Requests
            </Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('PurchaseRequests')}>
              <Text style={[styles.viewAllText, { color: appTheme.colors.info }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.skeletonSection}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.skeletonCard, { backgroundColor: appTheme.colors.cardBackground }]}
                >
                  <SkeletonRow gap={12}>
                    <Skeleton width={40} height={40} borderRadius={8} />
                    <SkeletonColumn gap={6} style={{ flex: 1 }}>
                      <Skeleton width="55%" height={14} />
                      <Skeleton width="35%" height={12} />
                    </SkeletonColumn>
                    <Skeleton width={70} height={24} borderRadius={12} />
                  </SkeletonRow>
                </View>
              ))}
            </View>
          ) : pendingPRs.length === 0 ? (
            <Text style={[styles.emptyText, { color: appTheme.colors.textMuted }]}>
              No pending requests
            </Text>
          ) : (
            pendingPRs.map((pr) => (
              <TouchableOpacity
                key={pr.id}
                style={[styles.listItem, { borderBottomColor: appTheme.colors.borderColor }]}
                onPress={() => (navigation as any).navigate('PurchaseRequestDetail', { requestId: pr.id })}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listItemTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
                    {pr.id.slice(0, 8)}
                  </Text>
                  <Text style={[styles.listItemSubtitle, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
                    {pr.items.length} item{pr.items.length !== 1 ? 's' : ''}
                    {pr.supplier ? ` - ${pr.supplier.name}` : ''}
                  </Text>
                </View>
                <ProcurementStatusBadge status={pr.status} type="pr" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── Suppliers ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
              Suppliers
            </Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Suppliers')}>
              <Text style={[styles.viewAllText, { color: appTheme.colors.info }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.skeletonSection}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.skeletonCard, { backgroundColor: appTheme.colors.cardBackground }]}
                >
                  <SkeletonRow gap={12}>
                    <Skeleton width={40} height={40} borderRadius={20} />
                    <SkeletonColumn gap={6} style={{ flex: 1 }}>
                      <Skeleton width="50%" height={14} />
                      <Skeleton width="70%" height={12} />
                    </SkeletonColumn>
                  </SkeletonRow>
                </View>
              ))}
            </View>
          ) : recentSuppliers.length === 0 ? (
            <Text style={[styles.emptyText, { color: appTheme.colors.textMuted }]}>
              No suppliers yet
            </Text>
          ) : (
            recentSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onPress={() =>
                  (navigation as any).navigate('SupplierDetail', { supplierId: supplier.id })
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          (navigation as any).navigate('SubscriptionPlans');
        }}
        requiredPlan={paywallCheck?.requiredPlan || 'pro'}
        modalType={paywallCheck?.modalType}
        title={paywallCheck?.title}
        description={paywallCheck?.description}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  /* Stats */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  /* Quick Actions */
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  /* Sections */
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  /* List Items */
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    paddingVertical: 16,
    textAlign: 'center',
  },
  /* Skeleton */
  skeletonSection: {
    gap: 8,
  },
  skeletonCard: {
    padding: 12,
    borderRadius: 8,
  },
});
