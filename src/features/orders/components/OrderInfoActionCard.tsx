/**
 * OrderInfoActionCard
 * A promoted status card used on the Order Details screen for Payment and
 * Delivery. Shows a tinted icon bubble, a title, a status pill, and an
 * optional quick-action button (e.g. "Mark as paid", "Assign delivery").
 * When no `actionLabel` is given it renders read-only (buyer view).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { AppButton, Pill } from '@/shared/components/ui';
import { Text } from '@/shared/components/ui/Typography';

interface OrderInfoActionCardProps {
  icon: string;
  iconColor: string;
  title: string;
  statusText: string;
  statusColor: string;
  actionLabel?: string;
  onActionPress?: () => void;
  disabled?: boolean;
}

const OrderInfoActionCard: React.FC<OrderInfoActionCardProps> = ({
  icon,
  iconColor,
  title,
  statusText,
  statusColor,
  actionLabel,
  onActionPress,
  disabled = false,
}) => {
  const { theme: appTheme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor },
      ]}
    >
      <View style={[styles.bubble, { backgroundColor: `${iconColor}1A` }]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, { color: appTheme.colors.text }]}>{title}</Text>
        <Pill text={statusText} color={statusColor} style={styles.pill} />
      </View>

      {actionLabel && onActionPress && (
        <AppButton
          title={actionLabel}
          onPress={onActionPress}
          variant="outline"
          size="small"
          disabled={disabled}
          style={styles.action}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, marginLeft: theme.spacing.sm + 4 },
  title: { fontSize: 16, fontFamily: theme.fonts.primary.semiBold },
  pill: { alignSelf: 'flex-start', marginTop: 6 },
  action: { paddingHorizontal: theme.spacing.md },
});

export default React.memo(OrderInfoActionCard);
