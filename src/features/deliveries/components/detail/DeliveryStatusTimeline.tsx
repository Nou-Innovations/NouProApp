/**
 * DeliveryStatusTimeline Component
 *
 * Renders the REAL status-change audit trail for a delivery, fetched from
 * GET /companies/:companyId/deliveries/:deliveryId/history.
 *
 * Unlike OrderUpdatesTimeline (which synthesizes a timeline from the current
 * status), this shows the actual recorded transitions — newest first.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import theme from '@/shared/theme';
import {
  DeliveryStatusHistoryEntry,
  DeliveryStatus,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
} from '@/shared/types/delivery';
import { getDeliveryHistory } from '../../deliveries.service';

interface DeliveryStatusTimelineProps {
  /** Owning business id (companyId in the API path) */
  companyId?: string;
  /** Delivery id to load history for */
  deliveryId: string;
  /**
   * Changes to this value trigger a refetch — pass the current deliveryStatus
   * so the timeline updates right after a status change.
   */
  refreshKey?: string | null;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return `${day}.${month}.${year} ${displayHours}:${minutes}${period}`;
}

const statusColor = (status?: DeliveryStatus | null): string =>
  status ? DELIVERY_STATUS_COLORS[status] ?? theme.colors.neutral : theme.colors.neutral;

const statusLabel = (status?: DeliveryStatus | null): string =>
  status ? DELIVERY_STATUS_LABELS[status] ?? status : '—';

export function DeliveryStatusTimeline({
  companyId,
  deliveryId,
  refreshKey,
}: DeliveryStatusTimelineProps) {
  const [history, setHistory] = useState<DeliveryStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId || !deliveryId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getDeliveryHistory(companyId, deliveryId);
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, deliveryId, refreshKey]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Nothing recorded yet — keep the section out of the way.
  if (!loading && history.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status history</Text>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={styles.loader} />
      ) : (
        <View style={styles.timelineContainer}>
          {history.map((entry, index) => (
            <View key={entry.id} style={styles.timelineItem}>
              <View style={styles.timelineIconColumn}>
                <View style={[styles.dot, { backgroundColor: statusColor(entry.to) }]} />
                {index < history.length - 1 && <View style={styles.line} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDate}>{formatDateTime(entry.createdAt)}</Text>
                <Text style={styles.timelineStatus}>
                  {entry.from ? `${statusLabel(entry.from)} → ` : ''}
                  {statusLabel(entry.to)}
                </Text>
                {!!entry.reason && <Text style={styles.timelineReason}>{entry.reason}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}
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
  loader: {
    alignSelf: 'flex-start',
  },
  timelineContainer: {
    paddingLeft: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineIconColumn: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 2,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.borderColor,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
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
    color: theme.colors.text,
  },
  timelineReason: {
    fontSize: 14,
    fontFamily: 'InterCustom-Regular',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});

export default DeliveryStatusTimeline;
