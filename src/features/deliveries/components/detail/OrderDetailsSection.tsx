/**
 * OrderDetailsSection Component
 * 
 * Collapsible section showing order details like scheduled time, transport, staff, and statuses.
 * Permissions control which fields are editable.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import type { Delivery, DeliveryStatus, PaymentStatus } from '@/shared/types/delivery';
import { PAYMENT_STATUS_LABELS } from '@/shared/types/delivery';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface OrderDetailsSectionProps {
  /** The delivery object */
  delivery: Delivery;
  /** Current delivery status */
  deliveryStatus: DeliveryStatus;
  /** Current payment status */
  paymentStatus: PaymentStatus;
  /** Expected delivery time */
  expectedDeliveryTime: Date;
  /** Selected transport display text */
  transportDisplay?: string;
  /** Selected staff display text */
  staffDisplay?: string;
  /** Permission flags */
  canEditSchedule?: boolean;
  canEditTransport?: boolean;
  canEditAssignedStaff?: boolean;
  canEditStatus?: boolean;
  canEditPayment?: boolean;
  /** Callbacks for opening modals */
  onOpenScheduleModal?: () => void;
  onOpenTransportModal?: () => void;
  onOpenStaffModal?: () => void;
  onOpenStatusModal?: () => void;
  onOpenPaymentModal?: () => void;
  /** Initial expanded state */
  initialExpanded?: boolean;
}

// Helper to format dates
const formatDateTime = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get color for delivery status
const getDeliveryStatusColor = (status: DeliveryStatus) => {
  switch (status) {
    case 'Draft': return theme.colors.error;
    case 'Scheduled': return theme.colors.warning;
    case 'Ready': return theme.colors.info;
    case 'InTransit': return theme.colors.info;
    case 'Delivered': return theme.colors.success;
    case 'Issue': return theme.colors.error;
    case 'Canceled': return theme.colors.neutral;
    default: return theme.colors.textSecondary;
  }
};

// Get color for payment status (UPPERCASE enum values)
const getPaymentStatusColor = (status: PaymentStatus | string) => {
  switch (status) {
    case 'PAID': return theme.colors.success;
    case 'UNPAID': return theme.colors.error;
    case 'PARTIALLY_PAID': return theme.colors.warning;
    case 'PAYMENT_PENDING': return theme.colors.info;
    case 'PENDING_CONFIRMATION': return theme.colors.warning;
    case 'OVERDUE': return theme.colors.error;
    case 'FAILED': return theme.colors.error;
    default: return theme.colors.textSecondary;
  }
};

// Status labels for display
const STATUS_LABELS: Record<DeliveryStatus, string> = {
  Draft: 'Draft',
  Scheduled: 'Scheduled',
  Ready: 'Ready',
  InTransit: 'In transit',
  Delivered: 'Delivered',
  Issue: 'Issue',
  Canceled: 'Canceled',
};

export function OrderDetailsSection({
  delivery,
  deliveryStatus,
  paymentStatus,
  expectedDeliveryTime,
  transportDisplay,
  staffDisplay,
  canEditSchedule = false,
  canEditTransport = false,
  canEditAssignedStaff = false,
  canEditStatus = false,
  canEditPayment = false,
  onOpenScheduleModal,
  onOpenTransportModal,
  onOpenStaffModal,
  onOpenStatusModal,
  onOpenPaymentModal,
  initialExpanded = true,
}: OrderDetailsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const heightAnimation = useRef(new Animated.Value(initialExpanded ? 1 : 0)).current;

  // Animate expansion
  useEffect(() => {
    const config = {
      duration: 300,
      update: {
        duration: 300,
        property: LayoutAnimation.Properties.opacity,
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        duration: 200,
        property: LayoutAnimation.Properties.opacity,
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    };

    LayoutAnimation.configureNext(config);

    Animated.timing(heightAnimation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const renderEditableField = (
    label: string,
    value: string,
    canEdit: boolean,
    onPress?: () => void
  ) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      {canEdit && onPress ? (
        <View style={styles.customFieldContainer}>
          <TouchableOpacity
            onPress={onPress}
            style={styles.customField}
            activeOpacity={0.7}
          >
            <Text style={styles.customFieldText}>{value}</Text>
            <Icon name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.simpleInfoText}>{value}</Text>
      )}
    </View>
  );

  const renderStatusButton = (
    label: string,
    status: string,
    color: string,
    canEdit: boolean,
    onPress?: () => void
  ) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      {canEdit && onPress ? (
        <TouchableOpacity
          style={[styles.fullWidthButton, { backgroundColor: color }]}
          onPress={onPress}
        >
          <Text style={styles.fullWidthButtonText}>{status}</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.fullWidthButton, { backgroundColor: color }]}>
          <Text style={styles.fullWidthButtonText}>{status}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.headerToggle}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.title}>Order Details</Text>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      <Animated.View
        style={{
          overflow: 'hidden',
          maxHeight: heightAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1000],
          }),
          opacity: heightAnimation,
        }}
      >
        {/* Ordered on (always read-only) */}
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Ordered on:</Text>
          <Text style={styles.simpleInfoText}>
            {delivery.orderTime ? formatDateTime(new Date(delivery.orderTime)) : 'Not set'}
          </Text>
        </View>

        {/* Scheduled for */}
        {renderEditableField(
          'Scheduled for:',
          formatDateTime(expectedDeliveryTime),
          canEditSchedule,
          onOpenScheduleModal
        )}

        {/* Transport */}
        {(canEditTransport || transportDisplay) && renderEditableField(
          'Transport:',
          transportDisplay || 'Not selected',
          canEditTransport,
          onOpenTransportModal
        )}

        {/* Assigned to */}
        {(canEditAssignedStaff || staffDisplay) && renderEditableField(
          'Assigned to:',
          staffDisplay || 'Not assigned',
          canEditAssignedStaff,
          onOpenStaffModal
        )}

        {/* Order status */}
        {renderStatusButton(
          'Order status:',
          STATUS_LABELS[deliveryStatus] || deliveryStatus,
          getDeliveryStatusColor(deliveryStatus),
          canEditStatus,
          onOpenStatusModal
        )}

        {/* Payment status */}
        {renderStatusButton(
          'Payment status:',
          PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus,
          getPaymentStatusColor(paymentStatus),
          canEditPayment,
          onOpenPaymentModal
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  headerToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'InterCustom-SemiBold',
  },
  infoItem: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.text,
    marginBottom: 8,
    fontFamily: 'InterCustom-SemiBold',
  },
  simpleInfoText: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 4,
    fontFamily: 'InterCustom-Regular',
  },
  customFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    backgroundColor: theme.colors.surface,
    height: 48,
    overflow: 'hidden',
  },
  customField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingHorizontal: 12,
    height: '100%',
  },
  customFieldText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: 'InterCustom-Medium',
    flex: 1,
    marginRight: 12,
  },
  fullWidthButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
  },
  fullWidthButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'InterCustom-SemiBold',
    textTransform: 'capitalize',
  },
});

export default OrderDetailsSection;
