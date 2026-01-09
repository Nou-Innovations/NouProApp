import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { Invoice, InvoiceStatus } from '@/shared/data/mockInvoices';
import Pill from '@/shared/components/ui/Pill';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';

export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue' | 'draft' | 'cancelled';

interface InvoiceCardProps {
  clientCompanyLogo: string | null;
  clientName: string;
  invoiceNumber: string;
  totalAmount?: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  isAdmin?: boolean;
  onPress?: () => void;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({
  clientCompanyLogo,
  clientName,
  invoiceNumber,
  totalAmount,
  issueDate,
  dueDate,
  status,
  isAdmin = false,
  onPress,
}) => {
  const { theme: appTheme } = useTheme();
  const { isItemViewed } = useNotifications();
  
  // Check if this is a new invoice (sent status) and hasn't been viewed
  const isNewInvoice = status.toLowerCase() === 'sent' && !isItemViewed(invoiceNumber);
  
  // Status colors using theme values
  const getStatusColor = (status: InvoiceStatus) => {
    switch (status.toLowerCase()) {
      case 'paid': return appTheme.colors.success;
      case 'sent': return appTheme.colors.error;
      case 'unpaid': return appTheme.colors.warning;
      case 'overdue': return appTheme.colors.error;
      case 'draft': return appTheme.colors.neutral;
      case 'cancelled': return appTheme.colors.neutral;
      default: return appTheme.colors.neutral;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: appTheme.colors.cardBackground,
          borderBottomColor: appTheme.colors.borderColor 
        },
        isNewInvoice && { backgroundColor: appTheme.colors.highlightedRow }
      ]} 
      onPress={onPress}
    >
      <View style={styles.header}>
        {clientCompanyLogo ? (
          <Image source={{ uri: clientCompanyLogo }} style={styles.logo} />
        ) : (
          <View style={[
            styles.logoPlaceholder, 
            { backgroundColor: appTheme.colors.inputBackground }
          ]}>
            <Icon name="business-outline" size={24} color={appTheme.colors.textSecondary} />
          </View>
        )}
        <View style={styles.headerTextContainer}>
          <Text style={[styles.clientName, { color: appTheme.colors.text }]}>{clientName}</Text>
          <Text style={[styles.invoiceNumber, { color: appTheme.colors.textSecondary }]}>{invoiceNumber}</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        {isAdmin && totalAmount !== undefined && (
          <View style={styles.detailRow}>
            <Icon name="cash-outline" size={16} color={appTheme.colors.textSecondary} style={styles.detailIcon} />
            <Text style={[styles.detailText, { color: appTheme.colors.text }]}>Total: ${totalAmount.toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Icon name="calendar-outline" size={16} color={appTheme.colors.textSecondary} style={styles.detailIcon} />
          <Text style={[styles.detailText, { color: appTheme.colors.text }]}>Issued: {formatDate(issueDate)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="time-outline" size={16} color={appTheme.colors.textSecondary} style={styles.detailIcon} />
          <Text style={[styles.detailText, { color: appTheme.colors.text }]}>Due: {formatDate(dueDate)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.statusContainer}>
          <Pill 
            text={status.toLowerCase()}
            color={getStatusColor(status)}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
  },
  header: {
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
  clientName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: theme.spacing.xs,
  },
  invoiceNumber: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
  },
  detailsContainer: {
    marginBottom: theme.spacing.sm + 4,
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
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusContainer: {
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.sm + 4,
    borderRadius: theme.borderRadius.sm,
  },
});

export default InvoiceCard; 