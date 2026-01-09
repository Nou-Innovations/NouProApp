import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { Delivery, DeliveryStatus, PaymentStatus } from '@/shared/types/delivery';
import Pill from '@/shared/components/ui/Pill';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';

interface DeliveryCardProps {
  delivery: Delivery;
  isUserAdmin?: boolean; 
  onPress?: () => void;
}

// Status color functions using theme
const getDeliveryStatusColorFromTheme = (status: DeliveryStatus | undefined, colors: typeof theme.colors) => {
  if (!status) return colors.neutral;
  switch (status.toLowerCase()) {
    case 'new': return colors.error;
    case 'new order': return colors.error;
    case 'pending': return colors.warning;
    case 'ongoing': return colors.info;
    case 'delivered': return colors.success;
    case 'canceled': return colors.neutral;
    default: return colors.neutral;
  }
};

const getPaymentStatusColorFromTheme = (status: PaymentStatus | undefined, colors: typeof theme.colors) => {
  if (!status) return colors.neutral;
  switch (status.toLowerCase()) {
    case 'paid': return colors.success;
    case 'unpaid': return colors.error;
    case 'pending confirmation': return colors.warning;
    default: return colors.neutral;
  }
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const formatDateTime = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleString(undefined, options);
};

const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, isUserAdmin = false, onPress }) => {
  const { theme: appTheme } = useTheme();
  const { isItemViewed } = useNotifications();
  
  // Check if this is a new delivery (status === 'new') and hasn't been viewed
  const isNewDelivery = delivery.deliveryStatus === 'new' && !isItemViewed(delivery.id);
  const isTransfer = delivery.type === 'transfer';
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.cardContainer, 
        { 
          backgroundColor: appTheme.colors.cardBackground,
          borderBottomColor: appTheme.colors.borderColor 
        },
        isNewDelivery && { backgroundColor: appTheme.colors.highlightedRow }
      ]}
    >
      <View style={styles.cardHeader}>
        {delivery.clientCompanyLogo ? (
          <Image source={{ uri: delivery.clientCompanyLogo }} style={styles.logo} />
        ) : (
          <View style={[
            styles.logoPlaceholder, 
            { backgroundColor: appTheme.colors.inputBackground }
          ]}>
            <Icon name="business-outline" size={24} color={appTheme.colors.textSecondary} />
          </View>
        )}
        <View style={styles.headerTextContainer}>
          <Text style={[styles.companyName, { color: appTheme.colors.text }]}>{delivery.clientCompanyName}</Text>
          {/* Show location(s) below company name */}
          {isTransfer ? (
            <View style={styles.transferLocationContainer}>
              <Text style={[styles.locationText, { color: appTheme.colors.textSecondary }]}>
                {delivery.fromLocation}
              </Text>
              <Icon 
                name="arrow-forward" 
                size={14} 
                color={appTheme.colors.textSecondary} 
                style={styles.transferArrow} 
              />
              <Text style={[styles.locationText, { color: appTheme.colors.textSecondary }]}>
                {delivery.toLocation}
              </Text>
            </View>
          ) : (
            <Text style={[styles.locationText, { color: appTheme.colors.textSecondary }]}>
              {delivery.clientAddress}
            </Text>
          )}
        </View>
      </View>

      {/* Order ID with icon (where location used to be) */}
      <View style={styles.detailRow}>
        <Icon name="receipt-outline" size={16} color={appTheme.colors.textSecondary} style={styles.detailIcon} />
        <Text style={[styles.detailText, { color: appTheme.colors.text }]}>{delivery.id}</Text>
      </View>

      <View style={styles.detailRow}>
        <Icon name="time-outline" size={16} color={appTheme.colors.textSecondary} style={styles.detailIcon} />
        <Text style={[styles.detailText, { color: appTheme.colors.text }]}>Ordered: {formatDate(delivery.orderTime)}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Icon name="calendar-outline" size={16} color={appTheme.colors.textSecondary} style={styles.detailIcon} />
        <Text style={[styles.detailText, { color: appTheme.colors.text }]}>Expected: {formatDateTime(delivery.expectedDeliveryDateTime)}</Text>
      </View>

      <View style={styles.detailRow}>
        <Icon name="cube-outline" size={16} color={appTheme.colors.textSecondary} style={styles.detailIcon} />
        <Text style={[styles.detailText, { color: appTheme.colors.text }]}>{delivery.itemCount} items</Text>
      </View>
      
      {isUserAdmin && delivery.totalAmount !== undefined && (
        <View style={styles.detailRow}>
          <Icon name="cash-outline" size={16} color={appTheme.colors.textSecondary} style={styles.detailIcon} />
          <Text style={[styles.detailText, styles.totalAmount, { color: appTheme.colors.text }]}>
            Total: ${delivery.totalAmount.toFixed(2)}
          </Text>
        </View>
      )}

      <View style={[
        styles.footerContainer, 
        { backgroundColor: appTheme.colors.inputBackground }
      ]}>
        {delivery.trackingNumber ? (
          <View style={styles.footerTrackingContainer}>
            <Icon name="qr-code-outline" size={16} color={appTheme.colors.textSecondary} style={styles.detailIcon} />
            <Text style={[styles.footerText, { color: appTheme.colors.text }]}>TRK: {delivery.trackingNumber}</Text>
          </View>
        ) : ( 
          <View />
        )}

        <View style={styles.footerStatusContainer}>
          <View style={styles.statusContainer}>
            {delivery.deliveryStatus && (
              <Pill 
                text={delivery.deliveryStatus.toLowerCase()}
                color={getDeliveryStatusColorFromTheme(delivery.deliveryStatus, appTheme.colors)}
              />
            )}
            {delivery.paymentStatus && (
              <Pill 
                text={delivery.paymentStatus.toLowerCase()}
                color={getPaymentStatusColorFromTheme(delivery.paymentStatus, appTheme.colors)}
              />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm + 4,
  },
  logo: {
    width: theme.avatarSizes.sm + 8,
    height: theme.avatarSizes.sm + 8,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm + 4,
  },
  logoPlaceholder: {
    width: theme.avatarSizes.sm + 8,
    height: theme.avatarSizes.sm + 8,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm + 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  companyName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  detailIcon: {
    marginRight: theme.spacing.sm,
  },
  detailText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    flexShrink: 1,
  },
  totalAmount: {
    fontFamily: theme.fonts.primary.bold,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm + 4,
  },
  footerTrackingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  footerText: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
  },
  footerStatusContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xs + 2,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xs + 2,
  },
  transferLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    flexShrink: 1,
  },
  transferArrow: {
    marginHorizontal: theme.spacing.xs + 2,
  },
});

export default DeliveryCard; 