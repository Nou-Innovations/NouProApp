/**
 * OrderUpdatesTimeline Component
 * 
 * Displays a vertical timeline of delivery status updates.
 * Used in all delivery detail view variants (read-only).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import type { Delivery, DeliveryStatus, PaymentStatus } from '@/shared/types/delivery';

interface OrderUpdatesTimelineProps {
  /** The delivery object to display updates for */
  delivery: Delivery;
  /** Current delivery status (may differ from delivery.deliveryStatus if locally changed) */
  deliveryStatus?: DeliveryStatus;
  /** Current payment status (may differ from delivery.paymentStatus if locally changed) */
  paymentStatus?: PaymentStatus;
}

interface TimelineUpdate {
  id: string;
  status: string;
  timestamp: Date | null;
  completed: boolean;
  isCurrent?: boolean;
}

export function OrderUpdatesTimeline({
  delivery,
  deliveryStatus: statusOverride,
  paymentStatus: paymentOverride,
}: OrderUpdatesTimelineProps) {
  const deliveryStatus = statusOverride || delivery.deliveryStatus;
  const paymentStatus = paymentOverride || delivery.paymentStatus;

  // Generate timeline updates based on current status
  const orderUpdates = useMemo(() => {
    const isDelivered = deliveryStatus === 'Delivered';
    const isOutForDelivery = deliveryStatus === 'InTransit' || isDelivered;
    const isPacked = deliveryStatus === 'Ready' || isOutForDelivery;
    const isAssigned = deliveryStatus === 'Scheduled' || isPacked;

    // Derive stable timestamps proportionally from orderTime to now
    // This avoids fabricated Date.now()-X values that change every render
    const orderTimeMs = delivery.orderTime ? new Date(delivery.orderTime).getTime() :
                        delivery.createdAt ? new Date(delivery.createdAt).getTime() : Date.now();
    const nowMs = Date.now();
    const elapsed = Math.max(nowMs - orderTimeMs, 1); // avoid division by 0

    const baseUpdates: TimelineUpdate[] = [
      {
        id: 'update-1',
        status: 'Order Confirmed',
        timestamp: new Date(orderTimeMs),
        completed: true,
      },
      {
        id: 'update-2',
        status: 'Payment Received',
        timestamp: paymentStatus === 'PAID' || paymentStatus === 'PENDING_CONFIRMATION' || paymentStatus === 'PARTIALLY_PAID'
          ? new Date(orderTimeMs + elapsed * 0.1)
          : null,
        completed: paymentStatus === 'PAID',
      },
      {
        id: 'update-3',
        status: 'Transport Loading',
        timestamp: isPacked || isOutForDelivery || isDelivered
          ? new Date(orderTimeMs + elapsed * 0.25)
          : null,
        completed: isDelivered,
      },
      {
        id: 'update-4',
        status: 'Transport Loading Completed',
        timestamp: isDelivered
          ? new Date(orderTimeMs + elapsed * 0.5)
          : null,
        completed: isDelivered,
      },
      {
        id: 'update-5',
        status: 'Out for Delivery',
        timestamp: isOutForDelivery || isDelivered
          ? new Date(orderTimeMs + elapsed * 0.75)
          : null,
        completed: isDelivered,
      },
      {
        id: 'update-6',
        status: 'Awaiting Delivery Confirmation',
        timestamp: isDelivered
          ? new Date(orderTimeMs + elapsed * 0.9)
          : null,
        completed: isDelivered,
      },
    ];

    // Find current step
    let currentStepId: string | null = null;
    for (const update of baseUpdates) {
      if (!update.completed && update.timestamp) {
        currentStepId = update.id;
        break;
      }
    }

    // Only return updates that have timestamps (completed or current)
    return baseUpdates
      .filter(update => update.timestamp !== null)
      .map(update => ({
        ...update,
        isCurrent: update.id === currentStepId,
      }));
  }, [delivery.orderTime, paymentStatus, deliveryStatus]);

  // Format date and time for order updates (DD.MM.YY HH:MMam/pm)
  const formatUpdateDateTime = (date: Date | null) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${day}.${month}.${year} ${displayHours}:${minutes}${period}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Updates</Text>
      <View style={styles.timelineContainer}>
        {orderUpdates.map((update, index) => (
          <View key={update.id} style={styles.timelineItem}>
            <View style={styles.timelineIconColumn}>
              {update.completed ? (
                <View style={styles.timelineIconCompleted}>
                  <Icon name="checkmark" size={14} color="#FFFFFF" />
                </View>
              ) : update.isCurrent ? (
                <View style={styles.timelineIconCurrent}>
                  <Icon name="more-horizontal" size={14} color="#FFFFFF" />
                </View>
              ) : (
                <View style={styles.timelineIconPending} />
              )}
              {index < orderUpdates.length - 1 && (
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: update.completed ? theme.colors.success : theme.colors.borderColor }
                  ]}
                />
              )}
            </View>
            <View style={styles.timelineContent}>
              {update.timestamp && (
                <Text style={styles.timelineDate}>
                  {formatUpdateDateTime(update.timestamp)}
                </Text>
              )}
              <Text
                style={[
                  styles.timelineStatus,
                  { color: update.completed || update.isCurrent ? theme.colors.text : theme.colors.textMuted }
                ]}
              >
                {update.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'InterCustom-SemiBold',
    marginBottom: 16,
  },
  timelineContainer: {
    paddingLeft: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timelineIconColumn: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  timelineIconCompleted: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCurrent: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconPending: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.borderColor,
    backgroundColor: 'transparent',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
    paddingTop: 2,
  },
  timelineDate: {
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  timelineStatus: {
    fontSize: 16,
    fontFamily: 'InterCustom-SemiBold',
  },
});

export default OrderUpdatesTimeline;
