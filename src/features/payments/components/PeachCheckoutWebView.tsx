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

  /**
   * scheme://host[:port] from a URL, or null if it doesn't look like one.
   * Hand-rolled rather than `new URL()`: React Native's URL polyfill is incomplete and
   * has historically differed between platforms, and this runs on the payment path.
   */
  const originOf = (url?: string): string | null => {
    const match = (url || '').match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]+/);
    return match ? match[0].toLowerCase() : null;
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      // SECURITY (MOB-6): only accept bridge messages from the page we loaded.
      //
      // This handler used to act on ANY postMessage in the WebView. During a payment the
      // WebView also loads Peach's widget and, for a 3-D Secure challenge, a page on the
      // cardholder's issuing bank — arbitrary third-party origins. Any of them could post
      // {"event":"onCompleted"} and drive the success path.
      //
      // The gate is on the message SENDER, not on navigation. Blocking navigation would
      // break 3DS outright, because the issuer's domain cannot be known in advance (the
      // backend's own CSP carries the same reasoning). Only our checkout page posts these
      // messages, so pinning the origin closes the hole without touching the payment flow.
      const senderOrigin = originOf(event.nativeEvent.url);
      const expectedOrigin = originOf(checkoutUrl);
      if (!senderOrigin || !expectedOrigin || senderOrigin !== expectedOrigin) {
        console.warn('[PeachCheckout] Ignored bridge message from unexpected origin:', senderOrigin);
        return;
      }

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
        // SECURITY (MOB-6): https only in release. http is kept for __DEV__ because local
        // development legitimately points the API at http://<LAN-IP>:3000, and checkoutUrl
        // is derived from that same host.
        originWhitelist={__DEV__ ? ['https://*', 'http://*'] : ['https://*']}
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
