/**
 * PaywallModal Component
 * Shows upgrade prompt when a feature requires a paid plan
 * Based on app-logic.json paywallTriggers
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SubscriptionPlan, PLAN_INFO, PLAN_PRICES } from '@/shared/types/subscription';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  requiredPlan?: SubscriptionPlan;
  title?: string;
  message?: string;
  featureName?: string;
}

const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  onUpgrade,
  requiredPlan = 'pro',
  title = 'Upgrade Required',
  message,
  featureName = 'this feature',
}) => {
  const { theme: appTheme, isDarkMode } = useTheme();
  const planInfo = PLAN_INFO[requiredPlan];

  const defaultMessage = `Upgrade to ${planInfo.name} to unlock ${featureName} and more powerful features.`;

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

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="lock-closed" size={32} color="#F59E0B" />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            {title}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: appTheme.colors.textLight }]}>
            {message || defaultMessage}
          </Text>

          {/* Plan Card */}
          <View style={[styles.planCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB', borderColor: '#22C55E' }]}>
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: appTheme.colors.text }]}>
                {planInfo.name}
              </Text>
              <View style={styles.planPrice}>
                <Text style={[styles.priceAmount, { color: appTheme.colors.text }]}>
                  Rs {PLAN_PRICES[requiredPlan]}
                </Text>
                <Text style={[styles.pricePeriod, { color: appTheme.colors.textLight }]}>
                  /month
                </Text>
              </View>
            </View>

            <View style={styles.planFeatures}>
              {planInfo.highlights.slice(0, 4).map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Icon name="checkmark-circle" size={18} color="#22C55E" />
                  <Text style={[styles.featureText, { color: appTheme.colors.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: '#22C55E' }]}
              onPress={onUpgrade}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterButton}
              onPress={onClose}
            >
              <Text style={[styles.laterButtonText, { color: appTheme.colors.textLight }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
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
    borderBottomColor: '#E5E7EB',
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





