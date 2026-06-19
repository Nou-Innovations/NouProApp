/**
 * MyDeliveriesScreen — the driver-focused view.
 *
 * Shows deliveries assigned to the current user, grouped by stage, with a
 * primary action that advances each delivery to its next status. Completing a
 * delivery (→ DELIVERED) opens the proof-of-delivery capture sheet.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/components/ui';
import DeliveryCard from '@/features/deliveries/components/DeliveryCard';
import PodCaptureModal from '@/features/deliveries/components/PodCaptureModal';
import { Delivery, DeliveryStatus } from '@/shared/types/delivery';
import { useMyDeliveries } from '../hooks/useMyDeliveries';

// The next status + button label a driver can advance to, per current status.
const NEXT_ACTION: Partial<Record<DeliveryStatus, { next: DeliveryStatus; label: string }>> = {
  Draft: { next: 'Scheduled', label: 'Accept' },
  Scheduled: { next: 'Ready', label: 'Mark packed' },
  Ready: { next: 'InTransit', label: 'Start delivery' },
  InTransit: { next: 'Delivered', label: 'Mark delivered' },
};

const ACTIVE_TODO: DeliveryStatus[] = ['Draft', 'Scheduled', 'Ready'];
const COMPLETED: DeliveryStatus[] = ['Delivered', 'Issue', 'Canceled'];

export default function MyDeliveriesScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const { deliveries, loading, refreshing, error, refresh, advance } = useMyDeliveries();

  const [podTarget, setPodTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sections = useMemo(() => {
    const todo = deliveries.filter((d) => d.deliveryStatus && ACTIVE_TODO.includes(d.deliveryStatus));
    const outForDelivery = deliveries.filter((d) => d.deliveryStatus === 'InTransit');
    const completed = deliveries.filter((d) => d.deliveryStatus && COMPLETED.includes(d.deliveryStatus));
    return [
      { title: 'To do', data: todo },
      { title: 'Out for delivery', data: outForDelivery },
      { title: 'Completed', data: completed },
    ].filter((s) => s.data.length > 0);
  }, [deliveries]);

  const handleAdvance = async (delivery: Delivery) => {
    const action = delivery.deliveryStatus ? NEXT_ACTION[delivery.deliveryStatus] : undefined;
    if (!action) return;

    if (action.next === 'Delivered') {
      setPodTarget(delivery.id);
      return;
    }
    try {
      await advance(delivery.id, action.next);
    } catch {
      Alert.alert('Could not update', 'Please try again.');
    }
  };

  const handleConfirmPod = async (pod: { podPhotoUrl?: string | null; podSignatureUrl?: string | null }) => {
    if (!podTarget) return;
    setSubmitting(true);
    try {
      await advance(podTarget, 'Delivered', pod);
      setPodTarget(null);
    } catch {
      Alert.alert('Could not complete', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <PrimaryHeader
        title="My deliveries"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
      />

      {loading && deliveries.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={appTheme.colors.accent} />
        </View>
      ) : error && deliveries.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={[styles.retryButton, { backgroundColor: appTheme.colors.primary }]}>
            <Text style={{ color: '#FFFFFF' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={appTheme.colors.primary} />}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, { color: appTheme.colors.textSecondary, backgroundColor: appTheme.colors.background }]}>
              {section.title} · {section.data.length}
            </Text>
          )}
          renderItem={({ item }) => {
            const action = item.deliveryStatus ? NEXT_ACTION[item.deliveryStatus] : undefined;
            return (
              <View>
                <DeliveryCard
                  delivery={item}
                  currencySymbol="$"
                  onPress={() => (navigation as any).navigate('DeliveryDetail', { deliveryId: item.id })}
                />
                {action && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: appTheme.colors.accent }]}
                    onPress={() => handleAdvance(item)}
                  >
                    <Text style={styles.actionButtonText}>{action.label}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              iconName="truck-outline"
              title="No deliveries assigned"
              subtitle="Deliveries assigned to you will show up here."
            />
          }
          contentContainerStyle={deliveries.length === 0 ? { flex: 1 } : { paddingBottom: 24 }}
          stickySectionHeadersEnabled={false}
        />
      )}

      <PodCaptureModal
        visible={!!podTarget}
        onClose={() => setPodTarget(null)}
        onConfirm={handleConfirmPod}
        submitting={submitting}
      />
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
  sectionHeader: {
    fontSize: 14,
    fontFamily: 'InterCustom-SemiBold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  actionButton: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 12,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'InterCustom-SemiBold',
  },
});
