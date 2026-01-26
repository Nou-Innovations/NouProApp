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
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/launch/splash-logo.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.noupro.app',
      buildNumber: '1',
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSExceptionDomains: {
            localhost: {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true,
            },
            '192.168.100.136': {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: false,
            },
            '172.20.10.3': {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: false,
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
      versionCode: 1,
      permissions: [
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.RECORD_AUDIO',
        'android.permission.CAMERA',
      ],
    },
    web: {
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-dev-client',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow NouPro to use your location.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow NouPro to access your photos.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow NouPro to access your camera.',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/launch/splash-logo.png',
          imageResizeMode: 'contain',
          backgroundColor: '#000000',
        },
      ],
      'expo-asset',
    ],
    extra: {
      eas: {
        projectId: '862199f7-e9f9-4a46-9b37-a90773d8a72f',
      },
      // Pass environment variables to runtime
      appEnv: appEnv,
      isDemo: isDemo,
      isProd: isProd,
    },
    updates: {
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/862199f7-e9f9-4a46-9b37-a90773d8a72f',
    },
    runtimeVersion: '1.0.0',
  };
};
