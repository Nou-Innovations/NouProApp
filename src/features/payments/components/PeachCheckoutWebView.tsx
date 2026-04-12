import React, { useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '@/shared/theme/ThemeProvider';

export interface CheckoutEvent {
  event: 'onCompleted' | 'onCancelled' | 'onExpired' | 'onError';
  data?: any;
}

interface PeachCheckoutWebViewProps {
  checkoutUrl: string;
  onCompleted: (data?: any) => void;
  onCancelled: () => void;
  onError: (error?: any) => void;
}

export default function PeachCheckoutWebView({
  checkoutUrl,
  onCompleted,
  onCancelled,
  onError,
}: PeachCheckoutWebViewProps) {
  const { theme: appTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message: CheckoutEvent = JSON.parse(event.nativeEvent.data);

      switch (message.event) {
        case 'onCompleted':
          onCompleted(message.data);
          break;
        case 'onCancelled':
        case 'onExpired':
          onCancelled();
          break;
        case 'onError':
          onError(message.data);
          break;
      }
    } catch (e) {
      console.error('[PeachCheckout] Failed to parse WebView message:', e);
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: appTheme.colors.background }]}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: checkoutUrl }}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        originWhitelist={['https://*', 'http://*']}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[PeachCheckout] WebView error:', nativeEvent);
          onError(nativeEvent);
        }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
