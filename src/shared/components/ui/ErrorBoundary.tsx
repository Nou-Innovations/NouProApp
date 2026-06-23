/**
 * ErrorBoundary
 *
 * Catches any render/runtime crash in the screen tree and shows a recoverable
 * "Something went wrong" screen with a Reload button — instead of letting an
 * unhandled error wedge the JS thread into a frozen, untappable app (which is
 * exactly what a Hermes release-build crash does). The crash is also reported
 * to Sentry.
 *
 * Mounted high in App.tsx, just above the navigators, so it catches errors from
 * any screen. Styling is intentionally self-contained (no ThemeProvider, no
 * custom fonts, no NativeWind) so the fallback still renders even if the thing
 * that crashed was the theme or font layer.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Report to Sentry. No-op if Sentry isn't initialised (e.g. local dev with
    // no DSN). Wrapped so error reporting can never throw inside the boundary.
    try {
      Sentry.captureException(error, {
        extra: { componentStack: info.componentStack },
      });
    } catch {
      // ignore
    }
  }

  private handleReload = async () => {
    // Reload the JS app. This also applies any OTA update that finished
    // downloading in the background — which is how a shipped fix recovers a
    // previously crashing build.
    try {
      await Updates.reloadAsync();
    } catch {
      // In dev (or when updates are unavailable) just clear the error and
      // re-render the tree.
      this.setState({ hasError: false });
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>😵‍💫</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          The app hit an unexpected error. Reloading usually fixes it and loads the latest update.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={this.handleReload}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Reload app"
        >
          <Text style={styles.buttonText}>Reload app</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#161310',
  },
  emoji: {
    fontSize: 44,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAF8F5',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#A8A29E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#FF7A00',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
