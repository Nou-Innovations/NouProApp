# NouPro Demo Build Guide

## Overview

The **demo build** (also called **preview build**) is a professional, production-ready version of NouPro designed for:

- **Internal testing** - Test features before releasing to production
- **Investor presentations** - Showcase the app with real functionality
- **Beta testing** - Distribute to selected testers
- **App Store previews** - Preview how the app will look/behave in production

Demo builds are distributed internally via **TestFlight (iOS)** or **direct APK install (Android)** - they never go through the App Store/Play Store review process.

---

## What is Demo Mode?

Demo mode is controlled by the `EXPO_PUBLIC_APP_ENV` environment variable:

- `dev` - Development mode (local development)
- `demo` - Demo/preview mode (internal distribution)
- `prod` - Production mode (App Store/Play Store)

### Demo Mode Features

When running in demo mode (`EXPO_PUBLIC_APP_ENV=demo`):

- ✅ Full app functionality (all features enabled)
- ✅ Connects to your configured backend
- ✅ Real data and interactions
- ✅ Shows a "Demo Mode" badge in Settings
- 🔒 Future: Payments will be disabled to prevent real transactions

---

## Prerequisites

Before building, ensure you have:

1. **EAS CLI installed globally**
   ```bash
   npm install -g eas-cli
   ```

2. **Logged into Expo account**
   ```bash
   npx eas login
   ```

3. **Environment variables configured**
   - Create a `.env` file in the project root
   - Add your backend URL:
     ```
     EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api
     ```

---

## Local Testing (Demo Mode)

Test demo mode locally before building:

### macOS/Linux
```bash
EXPO_PUBLIC_APP_ENV=demo npx expo start
```

### Windows (PowerShell)
```powershell
$env:EXPO_PUBLIC_APP_ENV="demo"
npx expo start
```

### Windows (Command Prompt)
```cmd
set EXPO_PUBLIC_APP_ENV=demo
npx expo start
```

**What to verify:**
- App starts successfully
- Settings screen shows "Demo Mode" badge
- API calls connect to correct backend URL (check console logs)

---

## Building Demo/Preview Builds

### iOS (TestFlight)

Build and distribute via TestFlight:

```bash
npx eas build --profile preview --platform ios
```

**What happens:**
1. EAS builds your app in the cloud
2. Sets `EXPO_PUBLIC_APP_ENV=demo`
3. Creates an `.ipa` file
4. Uploads to App Store Connect (TestFlight)

**After build completes:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Select your app → TestFlight tab
3. Add internal testers by email
4. Testers receive TestFlight invitation
5. They install via TestFlight app on their iPhone

**Build time:** ~10-20 minutes

---

### Android (APK)

Build and distribute via direct download:

```bash
npx eas build --profile preview --platform android
```

**What happens:**
1. EAS builds your app in the cloud
2. Sets `EXPO_PUBLIC_APP_ENV=demo`
3. Creates an `.apk` file
4. Provides download link

**After build completes:**
1. Copy the download link from terminal
2. Share link with testers
3. Testers open link on Android device
4. Download and install APK
5. May need to enable "Install from Unknown Sources"

**Build time:** ~10-15 minutes

---

### Both Platforms

Build for both iOS and Android simultaneously:

```bash
npx eas build --profile preview --platform all
```

---

## Build Profiles Explained

Your `eas.json` contains three build profiles:

### 1. **development** (Local Dev Client)
- For local development only
- Includes development tools
- Hot reloading enabled
- Not for distribution

### 2. **preview** (Demo/Internal)
- **USE THIS FOR DEMOS & TESTING**
- Internal distribution only
- Production-like build
- Environment: `EXPO_PUBLIC_APP_ENV=demo`
- iOS: TestFlight internal
- Android: APK for direct install

### 3. **production** (App Store)
- For App Store/Play Store submission
- Public distribution
- Environment: `EXPO_PUBLIC_APP_ENV=prod`
- iOS: App Store Connect submission
- Android: AAB for Play Store

---

## Distribution Options

### iOS Distribution

| Method | Profile | Distribution | Use Case |
|--------|---------|--------------|----------|
| TestFlight Internal | `preview` | Up to 100 users | Team, investors, beta testers |
| TestFlight External | `production` | Up to 10,000 users | Public beta (requires review) |
| App Store | `production` | Unlimited | Public release |

### Android Distribution

| Method | Profile | Distribution | Use Case |
|--------|---------|--------------|----------|
| APK Link | `preview` | Unlimited | Internal testing, demos |
| Internal Testing | `production` | Up to 100 users | Internal track (Play Console) |
| Play Store | `production` | Unlimited | Public release |

---

## Over-the-Air (OTA) Updates

After distributing a build, you can update JavaScript/UI changes **without rebuilding**:

### When OTA Updates Work
- UI/component changes
- Logic updates
- New screens
- Style changes
- JavaScript-only updates

### When Full Rebuild Required
- Native dependency changes (new `expo install` packages)
- Config changes (`app.config.ts`, `eas.json`)
- Icon/splash screen changes
- Permission changes
- Version/build number updates

### Publish OTA Update
```bash
npx eas update --branch preview --message "Fixed login button"
```

Testers will receive the update automatically next time they open the app (or restart).

---

## Environment Variables Reference

### Build Profiles (set in `eas.json`)

**Preview Profile:**
```json
{
  "env": {
    "EXPO_PUBLIC_APP_ENV": "demo",
    "EXPO_PUBLIC_API_URL": "http://192.168.100.226:3000/api"
  }
}
```

**Production Profile:**
```json
{
  "env": {
    "EXPO_PUBLIC_APP_ENV": "prod",
    "EXPO_PUBLIC_API_URL": "https://api.noupro.app"
  }
}
```

### Local Testing (set in terminal)

```bash
# Demo mode
EXPO_PUBLIC_APP_ENV=demo npx expo start

# Production mode (testing)
EXPO_PUBLIC_APP_ENV=prod EXPO_PUBLIC_API_URL=https://api.noupro.app npx expo start
```

---

## Troubleshooting

### Build fails with "Invalid credentials"
```bash
npx eas login
npx eas build:configure
```

### App crashes on launch
- Check that backend URL is accessible from devices
- Verify environment variables are set correctly in `eas.json`
- Check build logs: `npx eas build:list`

### TestFlight upload fails
- Verify Apple Developer account has app configured
- Check that bundle identifier matches: `com.noupro.app`
- Ensure App Store Connect app is created

### Android install blocked
- Enable "Install from Unknown Sources" in Android settings
- Try downloading APK directly from EAS build URL
- Check that APK wasn't corrupted during download

### Demo badge not showing
- Verify `EXPO_PUBLIC_APP_ENV=demo` in build profile
- Check `src/config/env.ts` is correctly reading environment
- Rebuild with: `npx eas build --profile preview --clear-cache`

### API calls failing
- Verify backend is accessible from devices (not just localhost)
- Use LAN IP address (e.g., `http://192.168.x.x:3000/api`)
- For production, use public domain with HTTPS
- Check firewall/network settings

---

## Quick Reference

### Essential Commands

```bash
# Build iOS preview
npx eas build --profile preview --platform ios

# Build Android preview  
npx eas build --profile preview --platform android

# Build both platforms
npx eas build --profile preview --platform all

# Check build status
npx eas build:list

# Publish OTA update
npx eas update --branch preview --message "Update description"

# View build logs
npx eas build:view <BUILD_ID>
```

### Useful Links

- [EAS Build Dashboard](https://expo.dev/accounts/[account]/projects/noupro/builds)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)
- [Expo Documentation](https://docs.expo.dev/build/introduction/)

---

## Best Practices

### Before Building
1. ✅ Test locally with demo environment
2. ✅ Verify API URL is accessible from target devices
3. ✅ Update version number if needed
4. ✅ Commit all changes to git
5. ✅ Check that no secrets are in code

### After Building
1. ✅ Test the build yourself first
2. ✅ Verify demo badge appears
3. ✅ Test key user flows
4. ✅ Document known issues for testers
5. ✅ Provide feedback instructions

### For Investors/Demos
1. ✅ Use stable backend (not localhost)
2. ✅ Pre-load demo data if needed
3. ✅ Test on actual devices, not simulator
4. ✅ Have backup plan (video recording)
5. ✅ Prepare talking points for demo mode badge

---

## Support

For questions or issues:

1. Check [Expo EAS Documentation](https://docs.expo.dev/build/introduction/)
2. Review build logs: `npx eas build:view <BUILD_ID>`
3. Check #development channel in team chat
4. Contact: arnaud.labonne@icloud.com

---

**Last Updated:** January 2026
**EAS CLI Version:** 0.46.0+
**Expo SDK:** 53.0.0
