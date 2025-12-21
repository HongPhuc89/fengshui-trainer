# 🏗️ Build APK Locally (Without Cloud)

Guide to build Android APK locally on your machine without using EAS cloud build.

## 📋 Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
2. **Java Development Kit (JDK)** 11 or higher
3. **Android Studio** (for Android SDK)
4. **Android SDK** (API 33 or higher)
5. **EAS CLI**

## 🚀 Quick Setup

### 1. Install Android Studio

Download from: https://developer.android.com/studio

**During installation, make sure to install:**

- Android SDK
- Android SDK Platform
- Android Virtual Device (optional)

### 2. Setup Environment Variables

**Windows:**

```bash
# Add to System Environment Variables
ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Android\Android Studio\jbr

# Add to PATH
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%JAVA_HOME%\bin
```

**macOS/Linux:**

```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME=/Applications/Android\ Studio.app/Contents/jbr/Contents/Home
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$JAVA_HOME/bin
```

### 3. Verify Installation

```bash
# Check Java
java -version

# Check Android SDK
adb --version

# Should see version numbers for both
```

### 4. Install Android SDK Components

Open Android Studio → SDK Manager → Install:

- Android SDK Platform 33 (or latest)
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android SDK Command-line Tools

## ⚡ Build APK Locally

### Simple Command

```bash
npm run mobile:build:local
```

This will:

1. ✅ Build APK on your local machine
2. ✅ No cloud upload needed
3. ✅ Faster for subsequent builds
4. ✅ Output APK in `apps/mobile/android/app/build/outputs/apk/release/`

### Build Process

```
1. npm run mobile:build:local
   ↓
2. EAS prepares build environment
   ↓
3. Gradle builds APK locally
   ↓
4. APK saved to android/app/build/outputs/
   ↓
5. Done! (5-10 minutes)
```

## 📦 Build Output

**APK Location:**

```
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

**Install on Device:**

```bash
# Via ADB
adb install apps/mobile/android/app/build/outputs/apk/release/app-release.apk

# Or copy APK to device and install manually
```

## 🎯 Build Comparison

### Cloud Build (EAS)

```bash
npm run mobile:build:apk
```

- ✅ No local setup needed
- ✅ Works on any machine
- ✅ Consistent environment
- ❌ Slower (upload + build)
- ❌ Requires internet
- ❌ Free tier limits

### Local Build

```bash
npm run mobile:build:local
```

- ✅ Faster (no upload)
- ✅ No internet needed (after setup)
- ✅ Unlimited builds
- ✅ Full control
- ❌ Requires Android Studio
- ❌ Setup complexity
- ❌ Machine-dependent

## 🔧 Troubleshooting

### "ANDROID_HOME not set"

**Solution:**

```bash
# Windows (PowerShell)
$env:ANDROID_HOME = "C:\Users\YourUsername\AppData\Local\Android\Sdk"

# macOS/Linux
export ANDROID_HOME=$HOME/Library/Android/sdk
```

### "Java not found"

**Solution:**

```bash
# Install JDK 11 or higher
# Or use Android Studio's bundled JDK

# Windows
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr

# macOS
export JAVA_HOME=/Applications/Android\ Studio.app/Contents/jbr/Contents/Home
```

### "SDK location not found"

**Solution:**
Create `apps/mobile/android/local.properties`:

```properties
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### Build Fails with Gradle Error

**Solution:**

```bash
# Clean build
cd apps/mobile/android
./gradlew clean

# Or on Windows
gradlew.bat clean

# Then rebuild
npm run mobile:build:local
```

### "License not accepted"

**Solution:**

```bash
# Accept all licenses
cd %ANDROID_HOME%/tools/bin
sdkmanager --licenses

# Accept all by typing 'y'
```

## 📝 Build Scripts

### All Available Commands

```bash
# Cloud builds (EAS)
npm run mobile:build:apk    # APK via cloud
npm run mobile:build:aab    # AAB via cloud
npm run mobile:build:dev    # Dev build via cloud
npm run mobile:build:ios    # iOS via cloud

# Local build
npm run mobile:build:local  # APK locally
```

## 🎯 When to Use Local Build

**Use Local Build When:**

- ✅ You have Android Studio installed
- ✅ Building frequently (faster iterations)
- ✅ No internet or slow connection
- ✅ Want full control over build
- ✅ Need to debug build issues

**Use Cloud Build When:**

- ✅ Don't want to setup Android Studio
- ✅ Building occasionally
- ✅ Want consistent builds
- ✅ Building on different machines
- ✅ Building iOS (requires macOS locally)

## 🚀 Quick Start (Local Build)

```bash
# 1. Install Android Studio
# Download from: https://developer.android.com/studio

# 2. Set environment variables
# ANDROID_HOME, JAVA_HOME (see above)

# 3. Verify setup
java -version
adb --version

# 4. Build APK
npm run mobile:build:local

# 5. Install APK
adb install apps/mobile/android/app/build/outputs/apk/release/app-release.apk

# Done! 🎉
```

## 📊 Build Time Comparison

**Cloud Build:**

- Upload: 1-2 minutes
- Build: 5-10 minutes
- Download: 1 minute
- **Total: 7-13 minutes**

**Local Build:**

- First build: 5-10 minutes
- Subsequent: 2-5 minutes
- **Total: 2-10 minutes**

## 🎉 Summary

**Local build is faster and gives you more control, but requires setup.**

**Commands:**

```bash
# Cloud (easy, no setup)
npm run mobile:build:apk

# Local (fast, requires setup)
npm run mobile:build:local
```

**Choose based on your needs!** 🚀

---

**For detailed cloud build guide, see:** `MOBILE_BUILD_APK.md`
