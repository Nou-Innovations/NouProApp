import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import theme from '@/shared/theme';
import { SubscriptionStatus } from '@/shared/types/subscription';

interface SubscriptionWarningBannerProps {
  status: SubscriptionStatus;
  daysRemaining?: number;
  onPress?: () => void;
}

const BANNER_CONFIG: Record<string, { bg: string; border: string; icon: string; title: string; getMessage: (days: number) => string }> = {
  grace: {
    bg: '#FEF3C7',
    border: '#F2A900',
    icon: '#F2A900',
    title: 'Payment Failed',
    getMessage: (days: number) =>
      days > 0
        ? `Your subscription payment failed. You have ${days} day${days !== 1 ? 's' : ''} to update your payment method.`
        : 'Your subscription payment failed. Please update your payment method now.',
  },
  expired: {
    bg: '#FEE2E2',
    border: '#D6453E',
    icon: '#D6453E',
    title: 'Subscription Expired',
    getMessage: () =>
      'Your subscription has expired. Renew now to keep access to your features.',
  },
};

export default function SubscriptionWarningBanner({ status, daysRemaining = 0, onPress }: SubscriptionWarningBannerProps) {
  const { theme: appTheme } = useTheme();

  if (status === 'active') return null;

  const config = BANNER_CONFIG[status];
  if (!config) return null;

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.banner, { backgroundColor: config.bg, borderColor: config.border }]}
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
    >
      <AlertTriangle size={20} color={config.icon} strokeWidth={2} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: appTheme.colors.text }]}>{config.title}</Text>
        <Text style={[styles.message, { color: appTheme.colors.textSecondary }]}>
          {config.getMessage(daysRemaining)}
        </Text>
        {onPress && (
          <Text style={[styles.cta, { color: config.border }]}>
            {status === 'grace' ? 'Update Payment Method' : 'Renew Subscription'}
          </Text>
        )}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 18,
  },
  cta: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 6,
  },
});
