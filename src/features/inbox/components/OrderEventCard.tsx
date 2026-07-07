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
import { AppButton, ButtonRow } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { OrderEventMessage, OrderEventStatus, OrderEventPayload } from '@/shared/types/inbox';
import { formatCurrency } from '../utils/orderEventMapper';
import { formatMessageTimestamp } from '../inbox.format';
import DoubleCheck, { SingleCheck } from './DoubleCheck';

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
  // Defensive: a malformed / legacy order_event without a full payload must never
  // crash the chat. Normalise to safe defaults so every field used below is present.
  const raw: any = message.payload || {};
  const payload: OrderEventPayload = {
    orderId: raw.orderId ?? '',
    orderRef: raw.orderRef ?? raw.orderId ?? '—',
    buyer: raw.buyer ?? { id: '', name: 'Buyer', logo: '', location: '' },
    seller: raw.seller ?? { id: '', name: 'Seller', logo: '', location: '' },
    status: (raw.status ?? 'NEW') as OrderEventStatus,
    paymentStatus: raw.paymentStatus ?? 'UNPAID',
    itemsPreview: Array.isArray(raw.itemsPreview) ? raw.itemsPreview : [],
    totalItemsCount: raw.totalItemsCount ?? (Array.isArray(raw.itemsPreview) ? raw.itemsPreview.length : 0),
    subtotal: raw.subtotal ?? raw.totalAmount ?? 0,
    vatAmount: raw.vatAmount ?? 0,
    vatPercent: raw.vatPercent ?? 0,
    deliveryFee: raw.deliveryFee ?? 0,
    totalAmount: raw.totalAmount ?? 0,
    currency: raw.currency ?? 'MUR',
    delivery: raw.delivery ?? { type: 'delivery' as const },
    createdAt: raw.createdAt ?? '',
    schemaVersion: raw.schemaVersion ?? '1.0',
  };

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

  // Bottom timestamp + delivery-status tick (same as InvoiceEventCard).
  const renderTick = () => {
    if (!message.isOutgoing || !message.status) return null;
    if (message.status === 'sent' || message.status === 'delivered' || message.status === 'seen') {
      const tickColor = message.status === 'seen' ? '#FF7A00' : colors.textMuted;
      return (
        <View style={{ marginLeft: 4 }}>
          {message.status === 'sent'
            ? <SingleCheck size={14} color={tickColor} />
            : <DoubleCheck size={14} color={tickColor} />}
        </View>
      );
    }
    let name = 'time-outline';
    let color = colors.textMuted;
    switch (message.status) {
      case 'sending': name = 'time-outline'; break;
      case 'failed': name = 'alert-circle-outline'; color = '#D6453E'; break;
    }
    return <Icon name={name} size={15} strokeWidth={2} color={color} style={{ marginLeft: 4 }} />;
  };

  // Activity timeline — honest labels from the real order status. Only "Order placed"
  // has a real timestamp (createdAt); per-step timestamps aren't tracked, so the rest
  // render without a (previously fabricated) date.
  const getActivityTimeline = (): { label: string; date: string }[] => {
    const items = [{ label: 'Order placed', date: payload.createdAt || '' }];
    if (payload.status !== 'NEW') items.push({ label: 'Order confirmed', date: '' });
    if (payload.status === 'ONGOING' || payload.status === 'DONE') items.push({ label: 'Preparing', date: '' });
    if (payload.status === 'DONE') items.push({ label: 'Delivered', date: '' });
    if (payload.status === 'CANCELED') items.push({ label: 'Canceled', date: '' });
    return items;
  };

  // Payment timeline — reflects the real payment status only. No fabricated split amounts.
  const getPaymentTimeline = (): { label: string; amount?: number; date: string }[] => {
    switch (payload.paymentStatus) {
      case 'PAID':
        return [{ label: 'Paid in full', amount: payload.totalAmount, date: '' }];
      case 'PENDING_CONFIRMATION':
        return [{ label: 'Payment pending confirmation', date: '' }];
      case 'PARTIALLY_PAID':
        return [{ label: 'Partially paid', date: '' }];
      default:
        return [{ label: 'Awaiting payment', date: '' }];
    }
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
          { backgroundColor: message.isOutgoing ? '#E8590C' : '#2ACF01' }
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
        <ButtonRow style={styles.actionButtons}>
          <AppButton
            title="Decline"
            variant="outline"
            size="small"
            onPress={() => onDeclineOrder?.(payload.orderId)}
          />
          <AppButton
            title="Confirm"
            variant="primary"
            size="small"
            onPress={() => onConfirmOrder?.(payload.orderId)}
          />
        </ButtonRow>
      )}

      {/* === TIMESTAMP (below buttons, like invoice/estimate) === */}
      <View style={styles.footer}>
        <Text style={[styles.footerTime, { color: colors.textMuted }]}>
          {formatMessageTimestamp(message.timestamp)}
        </Text>
        {renderTick()}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    width: 300,
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
    marginTop: 8,
    paddingBottom: 4,
  },
  // Bottom timestamp
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  footerTime: {
    fontSize: 12,
  },
});

export default OrderEventCard;
