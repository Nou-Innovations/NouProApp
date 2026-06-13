/**
 * PaywallModal Component
 * Shows upgrade prompt when a feature requires a paid plan
 * Supports 4 modal types from app-logic.json paywallTriggers.modalTemplates:
 * - feature_gate: Default for locked features
 * - limit_reached: For quota exceeded scenarios
 * - enterprise_control: For enterprise-only control systems
 * - soft_upsell: Non-blocking inline nudge (renders as smaller modal)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SubscriptionPlan, PLAN_INFO, PLAN_PRICES_MONTHLY, CURRENCY } from '@/shared/types/subscription';
import { PaywallModalType } from '@/shared/utils/permissions';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  requiredPlan?: SubscriptionPlan;
  modalType?: PaywallModalType;
  title?: string;
  /** Primary description/message for the modal */
  description?: string;
  /** @deprecated Use description instead */
  message?: string;
  /** @deprecated Use title instead */
  featureName?: string;
  /** Current limit value for limit_reached modals */
  currentLimit?: number;
  /** Callback for "Contact sales" button in enterprise_control modal */
  onContactSales?: () => void;
}

/**
 * Modal configuration per type
 */
const MODAL_CONFIG: Record<PaywallModalType, {
  icon: string;
  iconColor: string;
  iconBgColor: string;
  primaryCTA: string;
  secondaryCTA: string;
  showContactSales?: boolean;
}> = {
  feature_gate: {
    icon: 'lock-closed',
    iconColor: '#F2A900',
    iconBgColor: '#FEF3C7',
    primaryCTA: 'Upgrade Now',
    secondaryCTA: 'Maybe Later',
  },
  limit_reached: {
    icon: 'alert-circle',
    iconColor: '#D6453E',
    iconBgColor: '#FEE2E2',
    primaryCTA: 'Upgrade',
    secondaryCTA: 'Manage Limits',
  },
  enterprise_control: {
    icon: 'shield-checkmark',
    iconColor: '#8B5CF6',
    iconBgColor: '#EDE9FE',
    primaryCTA: 'Upgrade to Enterprise',
    secondaryCTA: 'Contact Sales',
    showContactSales: true,
  },
  soft_upsell: {
    icon: 'sparkles',
    iconColor: '#2A75E6',
    iconBgColor: '#DBEAFE',
    primaryCTA: 'Learn More',
    secondaryCTA: 'Not Now',
  },
};

const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  onUpgrade,
  requiredPlan = 'pro',
  modalType = 'feature_gate',
  title,
  description,
  message,
  featureName = 'this feature',
  currentLimit,
  onContactSales,
}) => {
  const { theme: appTheme, isDarkMode } = useTheme();
  const planInfo = PLAN_INFO[requiredPlan];
  const config = MODAL_CONFIG[modalType];

  // Determine the display title
  const displayTitle = title || (modalType === 'limit_reached' 
    ? 'Limit Reached' 
    : modalType === 'enterprise_control'
    ? 'Enterprise Feature'
    : 'Upgrade Required');

  // Determine the display message
  const displayMessage = description || message || 
    `Upgrade to ${planInfo.name} to unlock ${featureName} and more powerful features.`;

  // Handle contact sales
  const handleContactSales = () => {
    if (onContactSales) {
      onContactSales();
    } else {
      // Default: open email
      Linking.openURL('mailto:sales@noupro.app?subject=Enterprise%20Inquiry');
    }
    onClose();
  };

  // Handle secondary button press
  const handleSecondaryPress = () => {
    if (config.showContactSales) {
      handleContactSales();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: appTheme.colors.surface }]}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color={appTheme.colors.textLight} />
          </TouchableOpacity>

          {/* Icon - varies by modal type */}
          <View style={[styles.iconContainer, { backgroundColor: config.iconBgColor }]}>
            <Icon name={config.icon as any} size={32} color={config.iconColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            {displayTitle}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: appTheme.colors.textLight }]}>
            {displayMessage}
          </Text>

          {/* Current Limit Info (for limit_reached) */}
          {modalType === 'limit_reached' && currentLimit !== undefined && (
            <View style={[styles.limitBadge, { backgroundColor: isDarkMode ? '#1C1917' : '#FAF8F5' }]}>
              <Text style={[styles.limitText, { color: appTheme.colors.textLight }]}>
                Your limit: {currentLimit}
              </Text>
            </View>
          )}

          {/* Plan Card */}
          <View style={[styles.planCard, { backgroundColor: isDarkMode ? '#1C1917' : '#FAF8F5', borderColor: appTheme.colors.success }]}>
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: appTheme.colors.text }]}>
                {planInfo.name}
              </Text>
              <View style={styles.planPrice}>
                <Text style={[styles.priceAmount, { color: appTheme.colors.text }]}>
                  {CURRENCY.symbol}{PLAN_PRICES_MONTHLY[requiredPlan].toLocaleString()}
                </Text>
                <Text style={[styles.pricePeriod, { color: appTheme.colors.textLight }]}>
                  /month
                </Text>
              </View>
            </View>

            <View style={styles.planFeatures}>
              {planInfo.highlights.slice(0, 4).map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={18} color={appTheme.colors.success} />
                  <Text style={[styles.featureText, { color: appTheme.colors.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.billingNote, { color: appTheme.colors.textSecondary }]}>
              Choose monthly or yearly billing on upgrade
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: appTheme.colors.success }]}
              onPress={onUpgrade}
            >
              <Text style={styles.upgradeButtonText}>{config.primaryCTA}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterButton}
              onPress={handleSecondaryPress}
            >
              <Text style={[styles.laterButtonText, { color: appTheme.colors.textLight }]}>
                {config.secondaryCTA}
              </Text>
            </TouchableOpacity>

            {/* Additional Contact Sales button for enterprise_control */}
            {modalType === 'enterprise_control' && (
              <TouchableOpacity
                style={styles.laterButton}
                onPress={onClose}
              >
                <Text style={[styles.laterButtonText, { color: appTheme.colors.textLight }]}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: theme.fonts.primary.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  limitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  limitText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
  planCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginBottom: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE6DF',
  },
  planName: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  planPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
  },
  pricePeriod: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginLeft: 2,
  },
  planFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    flex: 1,
  },
  billingNote: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: 8,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  upgradeButton: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  laterButton: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default PaywallModal;
