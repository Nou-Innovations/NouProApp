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
    // Native splash: a solid brand-brown screen, no visible mark. This is deliberate.
    // LaunchScreen's first frame is also solid #1A1714 (bgOpacity and logoScale both
    // start at 0), so the native -> JS handoff is invisible: the warehouse photo and
    // the NOUPRO wordmark then fade in as designed. A logo here would instead pop away
    // the instant LaunchScreen mounts.
    //
    // `splash-none.png` is a fully transparent square, NOT a logo. Leaving `image` out
    // entirely would be the obvious way to get a bare colour, but expo-splash-screen
    // 0.30 then writes an empty <subviews/> into SplashScreen.storyboard, and its own
    // removeImageFromSplashScreen() crashes reading that back on the next prebuild.
    // An invisible image keeps the storyboard round-trippable.
    splash: {
      image: './assets/launch/splash-none.png',
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
      // SECURITY (MOB-4): the persisted zustand store is plain AsyncStorage, so cloud/adb
      // backups would carry it off the device. Inert today (the committed manifest is what
      // ships and is already set to false) but it stops a future prebuild reverting it.
      allowBackup: false,
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
      // Declares the app's supported languages to the OS, which is what puts NouPro in
      // iOS Settings → App → Language and makes getLocales() report a language the app
      // can actually render. `expo install` couldn't add this itself because the config
      // is dynamic (app.config.ts), so it printed the snippet and left it to us.
      //
      // NOTE: ios/ and android/ are committed in this repo, so this takes effect on the
      // next prebuild or EAS build — not in the current dev client. Reading the device
      // locale from JS works today regardless; only the OS-level language list waits.
      'expo-localization' as const,
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'NouPro uses your location to show nearby businesses, set your business address, and track deliveries you manage.',
          // SECURITY (MOB-17): deliberately NO locationAlwaysAndWhenInUsePermission.
          // Setting it makes the expo-location plugin emit both NSLocationAlways* keys,
          // which ask for BACKGROUND location — a capability this app does not have and
          // does not use (no UIBackgroundModes on iOS, no ACCESS_BACKGROUND_LOCATION on
          // Android). It was pure App Review liability. The keys have been removed from
          // Info.plist; leaving this line in would let any prebuild put them back.
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
      // Must mirror the `splash` block above — see the comment there for why the image
      // is a transparent square. (The plugin's option is `resizeMode`; the previously
      // used `imageResizeMode` is not a valid key and was silently ignored.)
      [
        'expo-splash-screen',
        {
          image: './assets/launch/splash-none.png',
          resizeMode: 'contain',
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
      // SECURITY (MOB-3): OTA updates are signed. Without this, anyone who gets into the
      // Expo account can push arbitrary JavaScript to every installed app — the worst
      // single item in the mobile section.
      //
      // The build embeds the CONTENTS of this file, and `eas update` signs each publish
      // with the matching private key in keys/ (gitignored, and NOT recoverable — lose it
      // and no OTA can be published until a new store build ships a new certificate).
      // An unsigned publish is rejected by the client; it fails safe, keeping the current
      // bundle, but the OTA pipeline stops until publishes are signed.
      codeSigningCertificate: './certs/certificate.pem',
      codeSigningMetadata: { keyid: 'main', alg: 'rsa-v1_5-sha256' },
    },
    // Bumped for Batch D: this build changes native surface (permissions, manifest,
    // R8, code signing), so it must not receive updates built against the old native set.
    // Existing 1.0.0 installs keep getting 1.0.0 updates until they take the store build.
    runtimeVersion: '1.1.0',
  };
};
