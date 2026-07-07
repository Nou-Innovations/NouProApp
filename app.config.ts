import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo App Configuration
 * 
 * Dynamic configuration supporting multiple build environments:
 * - development: local development
 * - preview: internal demos (TestFlight/APK)
 * - production: App Store/Play Store
 * 
 * Environment variables are passed via EAS build profiles in eas.json
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV || 'dev';
  const isDemo = appEnv === 'demo';
  const isProd = appEnv === 'prod';

  return {
    ...config,
    name: 'NouPro',
    slug: 'noupro',
    scheme: 'noupro',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/launch/splash-logo.png',
      resizeMode: 'contain',
      backgroundColor: '#1A1714',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.noupro.app',
      buildNumber: '2',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSExceptionDomains: {
            localhost: {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true,
            },
          },
        },
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      package: 'com.noupro.app',
      versionCode: 2,
      permissions: [
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.RECORD_AUDIO',
        'android.permission.CAMERA',
        'android.permission.POST_NOTIFICATIONS',
      ],
    },
    web: {
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      ...(isProd ? [] : ['expo-dev-client' as const]),
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'NouPro uses your location to show nearby businesses, set your business address, and track deliveries you manage.',
          locationAlwaysAndWhenInUsePermission:
            'NouPro uses your location to show nearby businesses, set your business address, and track deliveries you manage.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'NouPro accesses your photo library so you can add product images, business logos, and share photos in chat.',
          cameraPermission:
            'NouPro uses the camera to photograph products for your catalog and to share photos in chat.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'NouPro uses the camera to photograph products for your catalog and to share photos in chat.',
          microphonePermission:
            'NouPro uses the microphone when you record videos to share with your business contacts.',
        },
      ],
      [
        'expo-media-library',
        {
          photosPermission:
            'NouPro accesses your photo library so you can add product images, business logos, and share photos in chat.',
          savePhotosPermission:
            'NouPro saves images you choose to download, such as shared photos and invoices, to your photo library.',
        },
      ],
      [
        'expo-contacts',
        {
          contactsPermission:
            'NouPro accesses your contacts only when you choose to share a contact card in a chat.',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/launch/splash-logo.png',
          imageResizeMode: 'contain',
          backgroundColor: '#1A1714',
        },
      ],
      'expo-asset',
      'expo-font',
      'expo-secure-store',
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'Allow NouPro to use Face ID for quick login.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#000000',
          defaultChannel: 'default',
        },
      ],
      '@sentry/react-native',
    ],
    extra: {
      eas: {
        projectId: '862199f7-e9f9-4a46-9b37-a90773d8a72f',
      },
      // Pass environment variables to runtime
      appEnv,
      isDemo,
      isProd,
    },
    updates: {
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/862199f7-e9f9-4a46-9b37-a90773d8a72f',
    },
    runtimeVersion: '1.0.0',
  };
};
