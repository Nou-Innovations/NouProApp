/**
 * Invoice / Estimate Event Card
 *
 * Same visual language as OrderEventCard (single radius-12 card, header + status
 * pill, collapsible accordion rows, action button) but for invoice/estimate chat
 * messages. Reads the optional `details` block (InvoiceCardDetails) carried on the
 * message; falls back to a minimal header-only card when absent.
 *
 * Structure:
 * 1. Header (receipt icon + "Invoice #…" + status pill)
 * 2. Accordion rows: Items (count → list), Total (amount → subtotal/tax/total)
 * 3. Confirm button (estimates, recipient side)
 * 4. Timestamp — below the buttons, outside the card body
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
import { AppButton } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { InvoiceMessage, EstimateMessage } from '@/shared/types/inbox';
import { formatCurrency } from '../utils/orderEventMapper';
import { formatMessageTimestamp } from '../inbox.format';
import DoubleCheck, { SingleCheck } from './DoubleCheck';

// ============================================================================
// Types
// ============================================================================

interface InvoiceEventCardProps {
  message: InvoiceMessage | EstimateMessage;
  onPress?: (id: string) => void;
  onConfirm?: (id: string) => void;
}

type ExpandedRow = 'items' | 'total' | null;

// Status pill colors — shared palette with the order card (payment + doc states).
const STATUS_COLORS: Record<string, string> = {
  UNPAID: '#D6453E',
  PAID: '#34A853',
  PENDING: '#F2A900',
  PENDING_CONFIRMATION: '#F2A900',
  PARTIALLY_PAID: '#F2A900',
  OVERDUE: '#D6453E',
  DRAFT: '#57534E',
  SENT: '#2A75E6',
  ACCEPTED: '#34A853',
  REJECTED: '#D6453E',
};

function formatStatusLabel(status?: string): string {
  if (!status) return '';
  const s = status.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================================
// Sub Components (mirrors OrderEventCard)
// ============================================================================

interface AnimatedItemProps {
  children: React.ReactNode;
  index: number;
  isVisible: boolean;
}

function AnimatedItem({ children, index, isVisible }: AnimatedItemProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      animatedValue.setValue(0);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 250,
        delay: index * 50,
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
        translateY: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
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
  colors: ReturnType<typeof resolveColors>;
  isLast?: boolean;
}

function AccordionRow({ label, value, valueColor, isExpanded, onToggle, expandedContent, colors, isLast }: AccordionRowProps) {
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
      !isLast && !isExpanded && { borderBottomColor: colors.border, borderBottomWidth: 1 },
    ]}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={[styles.accordionLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.accordionValue, { color: valueColor || colors.textPrimary }]}>{value}</Text>
      </TouchableOpacity>
      {isExpanded && (
        <Animated.View style={[
          styles.accordionContent,
          !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 },
          {
            opacity: animatedValue,
            transform: [{
              translateY: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }),
            }],
          },
        ]}>
          {expandedContent}
        </Animated.View>
      )}
    </View>
  );
}

// Incoming/outgoing color resolver (same values as the order card).
function resolveColors(isOutgoing: boolean, isDarkMode: boolean) {
  return {
    cardBg: isOutgoing ? '#1C1917' : (isDarkMode ? '#232020' : '#FFFFFF'),
    cardBorder: isOutgoing ? '#1C1917' : (isDarkMode ? '#332E2A' : '#ECE6DF'),
    textPrimary: isOutgoing ? '#FFFFFF' : (isDarkMode ? '#FAFAF9' : '#1C1917'),
    textSecondary: isOutgoing ? '#D6D3D1' : (isDarkMode ? '#D6D3D1' : '#57534E'),
    textMuted: isOutgoing ? '#A8A29E' : '#A8A29E',
    border: isOutgoing ? '#44403C' : (isDarkMode ? '#332E2A' : '#FAF8F5'),
    iconColor: isOutgoing ? '#FFFFFF' : (isDarkMode ? '#A8A29E' : '#57534E'),
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function InvoiceEventCard({ message, onPress, onConfirm }: InvoiceEventCardProps) {
  const { isDarkMode } = useTheme();
  const isOutgoing = message.isOutgoing;
  const colors = resolveColors(isOutgoing, isDarkMode);

  const isEstimate = message.type === 'estimate';
  const docLabel = isEstimate ? 'Estimate' : 'Invoice';
  const id = isEstimate ? (message as EstimateMessage).estimateId : (message as InvoiceMessage).invoiceId;
  const details = message.details || {};

  const number = details.number || id;
  const currency = details.currency || 'MUR';
  const items = details.items || [];
  const itemCount = details.itemCount ?? items.length;
  const subtotal = details.subtotal;
  const total = details.total ?? details.subtotal;
  const taxLike = total != null && subtotal != null && total > subtotal ? total - subtotal : null;
  const hasBody = items.length > 0 || total != null;

  const statusColor = details.status ? (STATUS_COLORS[details.status] || colors.textSecondary) : null;

  const [expandedRow, setExpandedRow] = useState<ExpandedRow>(null);
  const handleToggle = (row: ExpandedRow) => setExpandedRow(expandedRow === row ? null : row);

  const showConfirm = isEstimate && !isOutgoing;

  const renderTick = () => {
    if (!isOutgoing || !message.status) return null;
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
    let name: string = 'time-outline';
    let color = colors.textMuted;
    switch (message.status) {
      case 'sending': name = 'time-outline'; break;
      case 'failed': name = 'alert-circle-outline'; color = '#D6453E'; break;
    }
    return <Icon name={name} size={15} strokeWidth={2} color={color} style={{ marginLeft: 4 }} />;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => onPress?.(id)}
      style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
    >
      {/* === HEADER === */}
      <View style={styles.header}>
        <Icon name="receipt-outline" size={18} color={colors.iconColor} />
        <Text style={[styles.docId, { color: colors.textPrimary }]} numberOfLines={1}>
          {docLabel} #{number}
        </Text>
        <View style={styles.headerSpacer} />
        <View style={[styles.statusPill, { backgroundColor: statusColor || '#57534E' }]}>
          <Text style={styles.statusPillText}>
            {details.status ? formatStatusLabel(details.status) : docLabel}
          </Text>
        </View>
      </View>

      {/* === ACCORDION GRID === */}
      {hasBody ? (
        <View style={styles.grid}>
          {(items.length > 0 || itemCount > 0) && (
            <AccordionRow
              label="Items"
              value={`${itemCount} item${itemCount > 1 ? 's' : ''}`}
              isExpanded={expandedRow === 'items'}
              onToggle={() => handleToggle('items')}
              colors={colors}
              expandedContent={
                <View style={styles.expandedContent}>
                  {items.map((item, index) => (
                    <AnimatedItem key={`${index}-${item.name}`} index={index} isVisible={expandedRow === 'items'}>
                      <View style={styles.itemBlock}>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.name} ×{item.quantity}
                        </Text>
                        <Text style={[styles.itemPrice, { color: colors.textMuted }]}>
                          {formatCurrency(item.unitPrice * item.quantity, currency)}
                        </Text>
                      </View>
                    </AnimatedItem>
                  ))}
                </View>
              }
            />
          )}

          <AccordionRow
            label="Total"
            value={total != null ? formatCurrency(total, currency) : '—'}
            isExpanded={expandedRow === 'total'}
            onToggle={() => handleToggle('total')}
            colors={colors}
            isLast
            expandedContent={
              <View style={styles.expandedContent}>
                {subtotal != null && (
                  <AnimatedItem index={0} isVisible={expandedRow === 'total'}>
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                      <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                        {formatCurrency(subtotal, currency)}
                      </Text>
                    </View>
                  </AnimatedItem>
                )}
                {taxLike != null && (
                  <AnimatedItem index={1} isVisible={expandedRow === 'total'}>
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Tax & fees</Text>
                      <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                        {formatCurrency(taxLike, currency)}
                      </Text>
                    </View>
                  </AnimatedItem>
                )}
                <AnimatedItem index={2} isVisible={expandedRow === 'total'}>
                  <View style={[styles.totalRow, styles.totalRowFinal]}>
                    <Text style={[styles.totalLabelBold, { color: colors.textPrimary }]}>Total</Text>
                    <Text style={[styles.totalValueBold, { color: colors.textPrimary }]}>
                      {total != null ? formatCurrency(total, currency) : '—'}
                    </Text>
                  </View>
                </AnimatedItem>
              </View>
            }
          />
        </View>
      ) : (
        <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
          Tap to view {docLabel.toLowerCase()} details
        </Text>
      )}

      {/* === CONFIRM BUTTON (estimates, recipient side) === */}
      {showConfirm && (
        <AppButton
          title="Confirm Estimate"
          variant="primary"
          size="small"
          onPress={() => onConfirm?.(id)}
          fullWidth
          style={styles.actionButtons}
        />
      )}

      {/* === TIMESTAMP (below buttons, outside the card body) === */}
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
// Styles (mirrors OrderEventCard)
// ============================================================================

const styles = StyleSheet.create({
  card: {
    width: 300,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 4,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 0,
  },
  docId: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 1,
  },
  headerSpacer: {
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  grid: {
    marginTop: 4,
  },
  emptyHint: {
    fontSize: 14,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
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
  expandedContent: {
    paddingTop: 0,
  },
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
  actionButtons: {
    marginTop: 8,
    paddingBottom: 4,
  },
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

export default InvoiceEventCard;
