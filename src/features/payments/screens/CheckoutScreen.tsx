import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { Text } from '@/shared/components/ui/Typography';
import PeachCheckoutWebView from '../components/PeachCheckoutWebView';
import { getCheckoutResult } from '../payments.service';
import { useProfileStore } from '@/shared/store/profileStore';
import type { RootStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';

type CheckoutRouteProps = RouteProp<RootStackParamList, 'CheckoutScreen'>;

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute<CheckoutRouteProps>();
  const { theme: appTheme } = useTheme();
  const { checkoutUrl, paymentType, checkoutId } = route.params;
  const [hasError, setHasError] = useState(false);
  const webViewKey = useRef(0);

  const handleCompleted = useCallback(async () => {
    try {
      // Poll for result to confirm payment
      if (checkoutId) {
        const result = await getCheckoutResult(checkoutId);
        if (result.status === 'SUCCEEDED' && paymentType === 'SUBSCRIPTION') {
          // Refresh subscription data in store
          await useProfileStore.getState().refreshBusinesses();
        }
      }

      AppAlert.alert('Payment Successful', 'Your payment has been processed successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      // Payment may still have succeeded via webhook; navigate back optimistically
      AppAlert.alert('Payment Processing', 'Your payment is being processed. You will be notified once confirmed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [checkoutId, paymentType, navigation]);

  const handleCancelled = useCallback(() => {
    AppAlert.alert('Payment Cancelled', 'The payment was cancelled.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, [navigation]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    webViewKey.current += 1;
  }, []);

  const handleClose = useCallback(() => {
    AppAlert.alert(
      'Cancel Payment?',
      'Are you sure you want to cancel this payment?',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: appTheme.colors.background }} edges={['top']}>
      <SecondaryHeader
        title="Payment"
        leftAction={{ icon: 'close-outline', onPress: handleClose }}
      />
      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, { color: appTheme.colors.text }]}>
            Connection Error
          </Text>
          <Text style={[styles.errorSubtitle, { color: appTheme.colors.textSecondary }]}>
            Unable to load the payment page. Please check your connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: appTheme.colors.primary }]}
            onPress={handleRetry}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelText, { color: appTheme.colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PeachCheckoutWebView
          key={webViewKey.current}
          checkoutUrl={checkoutUrl}
          onCompleted={handleCompleted}
          onCancelled={handleCancelled}
          onError={handleError}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.medium,
  },
});
