/**
 * DeliveryDetailScreen - Router
 * 
 * Routes to the appropriate delivery detail view based on:
 * - Route params (viewAs, requireAccept)
 * - Delivery data (direction, type, assignedStaffId)
 * - User role (currentStaffEntry)
 * 
 * View Types:
 * - client: Business that made the order (read-only)
 * - supplier: Business fulfilling the order (full control)
 * - self: Manual order for self-delivery (full control, no other party)
 * - staff: Staff assigned to the delivery (limited operational view)
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useProfileStore } from '@/shared/store/profileStore';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { DeliveryDetailViewType } from '@/shared/types/navigation';
import { useDeliveryActions } from '../hooks/useDeliveryActions';

import { useDelivery } from '../hooks/useDelivery';
import {
  DeliveryDetailClientView,
  DeliveryDetailSupplierView,
  DeliveryDetailSelfView,
  DeliveryDetailStaffView,
} from './detail';

// Route params type
type DeliveryDetailScreenParams = {
  DeliveryDetail: {
    deliveryId: string;
    viewAs?: DeliveryDetailViewType;
    requireAccept?: boolean;
  };
};

/**
 * Determines which view to render based on context
 */
function determineViewType(
  delivery: {
    direction?: 'incoming' | 'outgoing';
    type?: 'delivery' | 'transfer';
    assignedStaffId?: string;
  } | null,
  currentStaffEntryId: string | null,
  routeParams: { viewAs?: DeliveryDetailViewType }
): DeliveryDetailViewType {
  // If explicitly specified in route params, use that
  if (routeParams.viewAs) {
    return routeParams.viewAs;
  }

  if (!delivery) {
    return 'supplier'; // Default fallback
  }

  // If current user is the assigned staff member, show staff view
  if (delivery.assignedStaffId && currentStaffEntryId && delivery.assignedStaffId === currentStaffEntryId) {
    return 'staff';
  }

  // If it's a transfer (internal), show self view
  if (delivery.type === 'transfer') {
    return 'self';
  }

  // If it's an incoming order (we received it from another business), show client view
  // Note: "incoming" means we ordered from them, so we're the client
  if (delivery.direction === 'incoming') {
    return 'client';
  }

  // Default: outgoing delivery, we're the supplier
  return 'supplier';
}

export default function DeliveryDetailScreen() {
  const route = useRoute<RouteProp<DeliveryDetailScreenParams, 'DeliveryDetail'>>();
  const { deliveryId, viewAs, requireAccept } = route.params;

  const { theme: appTheme } = useTheme();
  const { markItemAsViewed } = useNotifications();
  const navigation = useNavigation();
  const currentStaffEntry = useProfileStore((state) => state.currentStaffEntry);

  // Fetch delivery data
  const { delivery, loading, error } = useDelivery(deliveryId);
  const actions = useDeliveryActions(deliveryId);

  // Accept/Reject callbacks
  const handleAccept = useCallback(async () => {
    await actions.updateStatus('Scheduled');
  }, [actions]);

  const handleReject = useCallback(async () => {
    await actions.updateStatus('Canceled');
  }, [actions]);

  // Determine view type
  const viewType = useMemo(() => {
    return determineViewType(
      delivery,
      currentStaffEntry?.id || null,
      { viewAs }
    );
  }, [delivery, currentStaffEntry, viewAs]);

  // Mark delivery as viewed when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (deliveryId) {
        markItemAsViewed(deliveryId);
        if (__DEV__) {
          console.log(`[DeliveryDetailScreen] Marked delivery ${deliveryId} as viewed`);
        }
      }
    }, [deliveryId, markItemAsViewed])
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: appTheme.colors.textSecondary }]}>
            Loading delivery...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state (only show if no delivery data at all)
  if (!delivery) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: appTheme.colors.error }]}>
            {error || 'Delivery not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render the appropriate view based on viewType
  switch (viewType) {
    case 'client':
      return (
        <DeliveryDetailClientView
          delivery={delivery}
          requireAccept={requireAccept}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      );

    case 'supplier':
      return (
        <DeliveryDetailSupplierView
          delivery={delivery}
          requireAccept={requireAccept}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      );

    case 'self':
      return <DeliveryDetailSelfView delivery={delivery} />;

    case 'staff':
      return <DeliveryDetailStaffView delivery={delivery} />;

    default:
      // Fallback to supplier view
      return (
        <DeliveryDetailSupplierView
          delivery={delivery}
          requireAccept={requireAccept}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'InterCustom-Medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'InterCustom-Medium',
    textAlign: 'center',
  },
});
