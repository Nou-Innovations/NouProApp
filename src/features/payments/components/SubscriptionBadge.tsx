import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Text } from '@/shared/components/ui/Typography';
import { SubscriptionStatus, SUBSCRIPTION_STATUS_COLORS } from '@/shared/types/subscription';

interface SubscriptionBadgeProps {
  planName: string;
  status: SubscriptionStatus;
}

export default function SubscriptionBadge({ planName, status }: SubscriptionBadgeProps) {
  const { theme: appTheme } = useTheme();
  const statusColor = SUBSCRIPTION_STATUS_COLORS[status];

  return (
    <View style={[styles.badge, { backgroundColor: `${statusColor}15`, borderColor: statusColor }]}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <Text style={[styles.text, { color: appTheme.colors.text }]}>
        {planName}
      </Text>
      <Text style={[styles.status, { color: statusColor }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  status: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
});
