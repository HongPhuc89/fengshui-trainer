# 📱 Build APK for Mobile App (React Native Expo)

Complete guide to build Android APK for the Quiz Game mobile app.

## 📋 Prerequisites

- Expo account (free)
- EAS CLI installed
- Android development environment (optional for local builds)

## ⚡ Quick Build (Recommended - EAS Build)

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```

### 3. Configure Project

```bash
cd apps/mobile
eas build:configure
```

### 4. Build APK

```bash
# Build APK (for testing/distribution)
npm run mobile:build:apk

# Or build AAB (for Google Play Store)
npm run mobile:build:aab
```

## 📝 Detailed Setup

### Step 1: Install EAS CLI

```bash
# Install globally
npm install -g eas-cli

# Verify installation
eas --version
```

### Step 2: Login

```bash
# Login to Expo account
eas login

# If you don't have an account, create one at:
# https://expo.dev/signup
```

### Step 3: Initialize EAS

```bash
# Navigate to mobile app
cd apps/mobile

# Initialize EAS
eas build:configure

# This creates eas.json configuration file
```

### Step 4: Configure Environment

Create `apps/mobile/.env.production`:

```env
EXPO_PUBLIC_API_URL=https://book-api.hongphuc.top
```

### Step 5: Update eas.json

File `apps/mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Step 6: Update app.json

Ensure `apps/mobile/app.json` has correct configuration:

```json
{
  "expo": {
    "name": "Quiz Game",
    "slug": "quiz-game",
    "version": "1.0.0",
    "android": {
      "package": "com.quizgame.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

## 🚀 Build Commands

### Build APK (Preview/Testing)

```bash
# From project root
npm run mobile:build:apk

# Or from mobile directory
cd apps/mobile
eas build --platform android --profile preview
```

### Build AAB (Production/Play Store)

```bash
# From project root
npm run mobile:build:aab

# Or from mobile directory
cd apps/mobile
eas build --platform android --profile production
```

### Build for Development

```bash
npm run mobile:build:dev
```

## 📦 Build Profiles

### Preview (APK)

- **Use for:** Testing, internal distribution
- **Output:** APK file
- **Install:** Can install directly on devices
- **Size:** Larger than AAB

### Production (AAB)

- **Use for:** Google Play Store
- **Output:** AAB (Android App Bundle)
- **Install:** Via Play Store only
- **Size:** Optimized, smaller downloads

### Development

- **Use for:** Development builds
- **Output:** Development client
- **Install:** For testing with Expo Go

## 📱 After Build

### Download APK

```bash
# Build will provide download URL
# Example:
# ✔ Build finished
# Download: https://expo.dev/artifacts/eas/...
```

### Install on Device

**Method 1: Direct Download**

1. Open URL on Android device
2. Download APK
3. Install (enable "Install from unknown sources")

**Method 2: ADB**

```bash
# Download APK first
# Then install via ADB
adb install path/to/your-app.apk
```

## 🔧 npm Scripts

Add to root `package.json`:

```json
{
  "scripts": {
    "mobile:build:apk": "cd apps/mobile && eas build --platform android --profile preview",
    "mobile:build:aab": "cd apps/mobile && eas build --platform android --profile production",
    "mobile:build:dev": "cd apps/mobile && eas build --platform android --profile development",
    "mobile:build:ios": "cd apps/mobile && eas build --platform ios --profile production"
  }
}
```

## 🌐 Environment Configuration

### Development (.env.development)

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Production (.env.production)

```env
EXPO_PUBLIC_API_URL=https://book-api.hongphuc.top
```

## 🎯 Build Workflow

```
1. Update version in app.json
   ↓
2. Configure environment (.env.production)
   ↓
3. Run build command
   ↓
4. Wait for build (5-15 minutes)
   ↓
5. Download APK/AAB
   ↓
6. Test on device
   ↓
7. Distribute or upload to Play Store
```

## 📊 Build Options

### Local Build (Advanced)

Requires Android Studio and SDK:

```bash
# Install dependencies
npm install -g @expo/ngrok

# Build locally
eas build --platform android --local
```

### Cloud Build (Recommended)

```bash
# Build on EAS servers (free tier available)
eas build --platform android --profile preview
```

## 🔍 Troubleshooting

### Build Fails

```bash
# Clear cache and retry
eas build --platform android --profile preview --clear-cache
```

### Environment Variables Not Working

Ensure `.env.production` exists:

```bash
cp apps/mobile/.env.example apps/mobile/.env.production
```

### Version Conflicts

Update `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

## 📚 Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Application Services](https://expo.dev/eas)
- [Android App Bundle](https://developer.android.com/guide/app-bundle)

## 🎉 Quick Start Summary

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Configure (one-time)
cd apps/mobile
eas build:configure

# 4. Create environment
echo "EXPO_PUBLIC_API_URL=https://book-api.hongphuc.top" > .env.production

# 5. Build APK
npm run mobile:build:apk

# 6. Wait for build to complete
# 7. Download and install APK

# Done! 🎉
```

## 🚀 Automated Build

**From project root:**

```bash
# Build APK for testing
npm run mobile:build:apk

# Build AAB for Play Store
npm run mobile:build:aab
```

**Build time:** 5-15 minutes (cloud build)

**Output:** Download link in terminal

---

**Ready to build your mobile app!** 📱🚀
