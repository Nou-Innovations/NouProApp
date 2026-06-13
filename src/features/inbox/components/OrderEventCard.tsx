/**
 * Order Event Card Component (Accordion Version)
 * 
 * Structure:
 * 1. Header (Icon + Order ID)
 * 2. Expected date (only when accepted)
 * 3. Grid with accordion rows:
 *    - Items (count) → expands to item list + total
 *    - Total → expands to subtotal/vat/total
 *    - Delivery + Status → expands to activity timeline
 *    - Payment status (no accordion)
 * 4. Card tap → Order details screen
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { OrderEventMessage, OrderEventStatus } from '@/shared/types/inbox';
import { formatCurrency } from '../utils/orderEventMapper';
import { theme } from '@/shared';

// ============================================================================
// Types
// ============================================================================

interface OrderEventCardProps {
  message: OrderEventMessage;
  onOrderPress?: (orderId: string) => void;
  onConfirmOrder?: (orderId: string) => void;
  onDeclineOrder?: (orderId: string) => void;
}

type ExpandedRow = 'Order' | 'items' | 'total' | 'payment' | null;

// ============================================================================
// Status Colors
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  NEW: '#7A1F12',
  ONGOING: '#2A75E6',
  PENDING: '#2A75E6',
  DONE: '#34A853',
  IN_REVIEW: '#8B5CF6',
  CANCELED: '#57534E',
  ACCEPTED: '#34A853',
  REJECTED: '#D6453E',
};

const PAYMENT_COLORS: Record<string, string> = {
  UNPAID: '#D6453E',
  PAID: '#34A853',
  PENDING_CONFIRMATION: '#F2A900',
  PAYMENT_PENDING: '#F2A900',
  PARTIALLY_PAID: '#F2A900',
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatStatusLabel(status: OrderEventStatus): string {
  switch (status) {
    case 'IN_REVIEW': return 'In Review';
    case 'NEW': return 'New';
    case 'ONGOING': return 'Ongoing';
    case 'PENDING': return 'Pending';
    case 'DONE': return 'Done';
    case 'CANCELED': return 'Canceled';
    case 'ACCEPTED': return 'Accepted';
    case 'REJECTED': return 'Rejected';
    default: return status;
  }
}

function formatActivityDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  
  const day = date.toLocaleDateString('en-US', { day: '2-digit' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  return `${day} ${month}, ${time}`;
}

function formatExpectedDate(date?: string): string {
  if (!date) return 'Not planned yet';
  
  const parsed = new Date(date);
  if (!isNaN(parsed.getTime())) {
    const day = parsed.toLocaleDateString('en-US', { weekday: 'short' });
    const fullDate = parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${day}, ${fullDate}`;
  }
  
  return date;
}

// ============================================================================
// Sub Components
// ============================================================================

// Animated item with staggered delay
interface AnimatedItemProps {
  children: React.ReactNode;
  index: number;
  isVisible: boolean;
}

function AnimatedItem({ children, index, isVisible }: AnimatedItemProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (isVisible) {
      // Reset and animate with delay based on index
      animatedValue.setValue(0);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 250,
        delay: index * 50, // 50ms stagger between items
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      animatedValue.setValue(0);
    }
  }, [isVisible, index, animatedValue]);
  
  return (
    <Animated.View style={{
      opacity: animatedValue,
      transform: [{
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      }],
    }}>
      {children}
    </Animated.View>
  );
}

interface AccordionRowProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  isExpanded: boolean;
  onToggle: () => void;
  expandedContent: React.ReactNode;
  colors: any;
  isLast?: boolean;
}

function AccordionRow({ 
  label, 
  value, 
  valueColor,
  isExpanded, 
  onToggle, 
  expandedContent, 
  colors,
  isLast,
}: AccordionRowProps) {
  const animatedValue = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isExpanded ? 1 : 0,
      duration: 250,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animatedValue]);
  
  return (
    <View style={[
      styles.accordionContainer, 
      !isLast && !isExpanded && { borderBottomColor: colors.border, borderBottomWidth: 1 }
    ]}>
      <TouchableOpacity 
        style={styles.accordionHeader} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.accordionLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.accordionValue, { color: valueColor || colors.textPrimary }]}>
          {value}
        </Text>
      </TouchableOpacity>
      {isExpanded && (
        <Animated.View style={[
          styles.accordionContent,
          !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 },
          {
            opacity: animatedValue,
            transform: [{
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            }],
          }
        ]}>
          {expandedContent}
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function OrderEventCard({
  message,
  onOrderPress,
  onConfirmOrder,
  onDeclineOrder,
}: OrderEventCardProps) {
  const { isDarkMode } = useTheme();
  const { payload } = message;
  
  const [expandedRow, setExpandedRow] = useState<ExpandedRow>(null);
  
  // Colors - outgoing cards use primary color like chat bubbles
  const isOutgoingCard = message.isOutgoing;
  const colors = {
    cardBg: isOutgoingCard
      ? (isDarkMode ? '#1C1917' : '#1C1917')  // Warm near-black for outgoing
      : (isDarkMode ? '#232020' : '#FFFFFF'), // White/dark for incoming
    cardBorder: isOutgoingCard
      ? (isDarkMode ? '#1C1917' : '#1C1917')
      : (isDarkMode ? '#332E2A' : '#ECE6DF'),
    textPrimary: isOutgoingCard ? '#FFFFFF' : (isDarkMode ? '#FAFAF9' : '#1C1917'),
    textSecondary: isOutgoingCard ? '#D6D3D1' : (isDarkMode ? '#D6D3D1' : '#57534E'),
    textMuted: isOutgoingCard ? '#A8A29E' : (isDarkMode ? '#A8A29E' : '#A8A29E'),
    border: isOutgoingCard ? '#44403C' : (isDarkMode ? '#332E2A' : '#FAF8F5'),
    iconColor: isOutgoingCard ? '#FFFFFF' : (isDarkMode ? '#A8A29E' : '#57534E'),
    // Button colors based on direction
    confirmBg: isOutgoingCard ? '#FFFFFF' : '#1C1917',
    confirmText: isOutgoingCard ? '#1C1917' : '#FFFFFF',
    declineBorder: isOutgoingCard ? '#FFFFFF' : '#1C1917',
    declineText: isOutgoingCard ? '#FFFFFF' : '#1C1917',
  };
  
  // Status
  const statusColor = STATUS_COLORS[payload.status] || STATUS_COLORS.NEW;
  const paymentColor = PAYMENT_COLORS[payload.paymentStatus] || colors.textSecondary;
  
  // Show expected date only when order is accepted (not NEW)
  const showExpectedDate = payload.status !== 'NEW' && payload.status !== 'CANCELED';
  
  // Payment display
  const paymentDisplay = payload.paymentStatus === 'PENDING_CONFIRMATION' 
    ? 'Pending' 
    : payload.paymentStatus;
  
  const handleToggle = (row: ExpandedRow) => {
    setExpandedRow(expandedRow === row ? null : row);
  };
  
  const handleCardPress = () => onOrderPress?.(payload.orderId);
  
  // Helper: generate proportional timestamps between createdAt and now
  const proportionalDate = (index: number, total: number): string => {
    const start = new Date(payload.createdAt).getTime();
    const end = Date.now();
    const step = total > 1 ? (end - start) / (total - 1) : 0;
    return new Date(start + step * index).toISOString();
  };

  // Activity timeline with proportional timestamps
  const getActivityTimeline = () => {
    const labels: string[] = ['Order placed'];

    if (payload.status !== 'NEW') labels.push('Order confirmed');
    if (payload.status === 'ONGOING' || payload.status === 'DONE') labels.push('Preparing');
    if (payload.status === 'DONE') labels.push('Delivered');
    if (payload.status === 'CANCELED') labels.push('Canceled');

    return labels.map((label, i) => ({
      label,
      date: proportionalDate(i, labels.length),
    }));
  };

  // Payment timeline with proportional timestamps
  const getPaymentTimeline = () => {
    const items: { label: string; amount?: number }[] = [];

    if (payload.paymentStatus === 'UNPAID') {
      items.push({ label: 'Awaiting payment' });
    } else if (payload.paymentStatus === 'PENDING_CONFIRMATION') {
      const partialAmount = Math.round(payload.totalAmount * 0.5);
      items.push({ label: 'Partial payment received', amount: partialAmount });
      items.push({ label: 'Partial payment submitted', amount: payload.totalAmount - partialAmount });
      items.push({ label: 'Awaiting confirmation' });
    } else if (payload.paymentStatus === 'PAID') {
      const firstPayment = Math.round(payload.totalAmount * 0.3);
      const secondPayment = Math.round(payload.totalAmount * 0.3);
      const finalPayment = payload.totalAmount - firstPayment - secondPayment;
      items.push({ label: 'Partial payment received', amount: firstPayment });
      items.push({ label: 'Partial payment received', amount: secondPayment });
      items.push({ label: 'Final payment received', amount: finalPayment });
      items.push({ label: 'Payment complete' });
    }

    return items.map((item, i) => ({
      ...item,
      date: proportionalDate(i, items.length),
    }));
  };
  
  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handleCardPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      {/* === HEADER === */}
      <View style={styles.header}>
        <Icon name="package" size={18} color={colors.iconColor} />
        <Text style={[styles.orderId, { color: colors.textPrimary }]}>
          #{payload.orderRef}
        </Text>
        <View style={styles.headerSpacer} />
        <View style={[
          styles.directionPill,
          { backgroundColor: message.isOutgoing ? '#E8590C' : '#34A853' }
        ]}>
          <Text style={[
            styles.directionPillText,
            { color: message.isOutgoing ? '#ffffff' : '#ffffff' }
          ]}>
            {message.isOutgoing ? 'Export' : 'Import'}
          </Text>
        </View>
      </View>
      
      {/* === EXPECTED DATE === */}
      {showExpectedDate && (
        <Text style={[styles.expectedDate, { color: colors.textSecondary }]}>
          Expected: {formatExpectedDate(payload.delivery.expectedDate)}
        </Text>
      )}
      
      {/* === ACCORDION GRID === */}
      <View style={styles.grid}>
        {/* Items */}
        <AccordionRow
          label="Items"
          value={`${payload.totalItemsCount} item${payload.totalItemsCount > 1 ? 's' : ''}`}
          isExpanded={expandedRow === 'items'}
          onToggle={() => handleToggle('items')}
          colors={colors}
          expandedContent={
            <View style={styles.expandedContent}>
              {payload.itemsPreview.map((item, index) => (
                <AnimatedItem key={item.id} index={index} isVisible={expandedRow === 'items'}>
                  <View style={styles.itemBlock}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.name} ×{item.quantity}
                    </Text>
                    <Text style={[styles.itemPrice, { color: colors.textMuted }]}>
                      {formatCurrency(item.unitPrice * item.quantity, payload.currency)}
                    </Text>
                  </View>
                </AnimatedItem>
              ))}
            </View>
          }
        />
        
        {/* Total */}
        <AccordionRow
          label="Total"
          value={formatCurrency(payload.totalAmount, payload.currency)}
          isExpanded={expandedRow === 'total'}
          onToggle={() => handleToggle('total')}
          colors={colors}
          expandedContent={
            <View style={styles.expandedContent}>
              <AnimatedItem index={0} isVisible={expandedRow === 'total'}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                    {formatCurrency(payload.subtotal, payload.currency)}
                  </Text>
                </View>
              </AnimatedItem>
              <AnimatedItem index={1} isVisible={expandedRow === 'total'}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                    VAT ({payload.vatPercent}%)
                  </Text>
                  <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                    {formatCurrency(payload.vatAmount, payload.currency)}
                  </Text>
                </View>
              </AnimatedItem>
              {payload.deliveryFee > 0 && (
                <AnimatedItem index={2} isVisible={expandedRow === 'total'}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Delivery</Text>
                    <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                      {formatCurrency(payload.deliveryFee, payload.currency)}
                    </Text>
                  </View>
                </AnimatedItem>
              )}
              <AnimatedItem index={payload.deliveryFee > 0 ? 3 : 2} isVisible={expandedRow === 'total'}>
                <View style={[styles.totalRow, styles.totalRowFinal]}>
                  <Text style={[styles.totalLabelBold, { color: colors.textPrimary }]}>Total</Text>
                  <Text style={[styles.totalValueBold, { color: colors.textPrimary }]}>
                    {formatCurrency(payload.totalAmount, payload.currency)}
                  </Text>
                </View>
              </AnimatedItem>
            </View>
          }
        />
        
        {/* Delivery + Status */}
        <AccordionRow
          label="Order"
          value={formatStatusLabel(payload.status)}
          valueColor={statusColor}
          isExpanded={expandedRow === 'Order'}
          onToggle={() => handleToggle('Order')}
          colors={colors}
          expandedContent={
            <View style={styles.expandedContent}>
              {getActivityTimeline().map((activity, index) => (
                <AnimatedItem key={index} index={index} isVisible={expandedRow === 'Order'}>
                  <View style={styles.activityRow}>
                    <Text style={[styles.activityLabel, { color: colors.textPrimary }]}>
                      {activity.label}
                    </Text>
                    <Text style={[styles.activityDate, { color: colors.textMuted }]}>
                      {formatActivityDate(activity.date)}
                    </Text>
                  </View>
                </AnimatedItem>
              ))}
            </View>
          }
        />
        
        {/* Payment */}
        <AccordionRow
          label="Payment"
          value={paymentDisplay}
          valueColor={paymentColor}
          isExpanded={expandedRow === 'payment'}
          onToggle={() => handleToggle('payment')}
          colors={colors}
          isLast
          expandedContent={
            <View style={styles.expandedContent}>
              {getPaymentTimeline().map((payment, index) => (
                <AnimatedItem key={index} index={index} isVisible={expandedRow === 'payment'}>
                  <View style={styles.paymentActivityRow}>
                    <View style={styles.paymentActivityLeft}>
                      <Text style={[styles.activityLabel, { color: colors.textPrimary }]}>
                        {payment.label}
                      </Text>
                      {payment.amount && (
                        <Text style={[styles.paymentAmount, { color: colors.textSecondary }]}>
                          {formatCurrency(payment.amount, payload.currency)}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.activityDate, { color: colors.textMuted }]}>
                      {formatActivityDate(payment.date)}
                    </Text>
                  </View>
                </AnimatedItem>
              ))}
            </View>
          }
        />
      </View>
      
      {/* === ACTION BUTTONS (NEW orders only, seller side) === */}
      {payload.status === 'NEW' && !message.isOutgoing && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.declineButton, { borderColor: colors.declineBorder }]}
            onPress={() => onDeclineOrder?.(payload.orderId)}
            activeOpacity={0.7}
          >
            <Text style={[styles.declineButtonText, { color: colors.declineText }]}>
              Decline
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.confirmButton, { backgroundColor: colors.confirmBg }]}
            onPress={() => onConfirmOrder?.(payload.orderId)}
            activeOpacity={0.7}
          >
            <Text style={[styles.confirmButtonText, { color: colors.confirmText }]}>
              Confirm order
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    width: 260,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 4,
    borderRadius: 12,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 0,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerSpacer: {
    flex: 1,
  },
  directionPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  directionPillText: {
    fontSize: 14,
    fontWeight: '400',
  },
  
  // Expected date
  expectedDate: {
    fontSize: 14,
    paddingHorizontal: 4,
  },
  
  // Grid
  grid: {
    marginTop: 4,
  },
  
  // Accordion
  accordionContainer: {
    minHeight: 32,
    paddingHorizontal: 4,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 36,
  },
  accordionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  accordionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  accordionContent: {
    paddingBottom: 8,
  },
  
  // Expanded content (clean, no box)
  expandedContent: {
    paddingTop: 0,
  },
  
  // Activity timeline
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight:'400',
    flex: 1,
  },
  activityDate: {
    fontSize: 14,
    fontWeight: '400',
  },
  
  // Items
  itemBlock: {
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '400',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  
  // Total breakdown
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalRowFinal: {
    marginTop: 4,
    paddingTop: 0,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
  },
  totalLabelBold: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalValueBold: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Payment activity
  paymentActivityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  paymentActivityLeft: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    paddingBottom: 4,
  },
  declineButton: {
    width: '49%',
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    width: '49%',
    height: 40,
    marginLeft: '2%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OrderEventCard;
