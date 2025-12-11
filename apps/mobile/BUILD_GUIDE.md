# 📱 Mobile App Build Guide

Hướng dẫn build APK/AAB cho Android và IPA cho iOS.

## 📋 Prerequisites

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

---

## 🤖 Android Build

### Option 1: Build APK (Preview/Testing) - Cloud Build

```bash
npm run build:android:preview
```

- ✅ Tạo file APK để test
- ✅ Có thể cài trực tiếp lên thiết bị
- ✅ Không cần Google Play Console
- ⏱️ Build trên cloud (~10-15 phút)

### Option 2: Build APK - Local Build

```bash
npm run build:android:apk
```

- ✅ Build trên máy local
- ✅ Nhanh hơn cloud build
- ⚠️ Cần cài Android SDK và Java JDK
- ⚠️ Cần máy có cấu hình tốt

### Option 3: Build AAB (Production) - For Google Play

```bash
npm run build:android
```

- ✅ Tạo file AAB để upload lên Google Play Store
- ✅ Tối ưu kích thước app
- ⏱️ Build trên cloud (~10-15 phút)

---

## 🍎 iOS Build

### Build IPA (Production) - For App Store

```bash
npm run build:ios
```

- ✅ Tạo file IPA để upload lên App Store
- ⚠️ Cần Apple Developer Account ($99/year)
- ⏱️ Build trên cloud (~15-20 phút)

---

## 🚀 Quick Start - Build APK for Testing

### Bước 1: Login

```bash
eas login
```

### Bước 2: Build APK

```bash
cd apps/mobile
npm run build:android:preview
```

### Bước 3: Download APK

- Sau khi build xong, EAS sẽ cho link download
- Hoặc vào https://expo.dev/accounts/[your-account]/projects/mobile/builds
- Download file APK về máy

### Bước 4: Install trên Android

- Gửi file APK qua email/drive/adb
- Bật "Install from Unknown Sources" trên Android
- Mở file APK để cài đặt

---

## 📦 Build Profiles

### Development

```bash
eas build --profile development --platform android
```

- For development builds with dev client
- APK format

### Preview

```bash
npm run build:android:preview
```

- For internal testing
- APK format
- Không cần Google Play

### Production

```bash
npm run build:android
```

- For Google Play Store
- AAB format (optimized)

---

## 🔧 Configuration Files

### eas.json

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk" // APK for testing
      }
    },
    "production": {
      "android": {
        "buildType": "aab" // AAB for Play Store
      }
    }
  }
}
```

### app.json

- App name, version, icon, splash screen
- Bundle identifier
- Permissions

---

## 🎯 Recommended Workflow

### For Testing (Internal)

1. Build APK preview

```bash
npm run build:android:preview
```

2. Download và test trên thiết bị thật

3. Nếu OK, build production

### For Production (Google Play)

1. Update version trong `app.json`

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

2. Build AAB

```bash
npm run build:android
```

3. Download AAB file

4. Upload lên Google Play Console

---

## 🐛 Troubleshooting

### Error: "eas-cli not found"

```bash
npm install -g eas-cli
```

### Error: "Not logged in"

```bash
eas login
```

### Error: "Build failed"

- Check logs trên Expo dashboard
- Kiểm tra `app.json` configuration
- Đảm bảo tất cả dependencies đã cài đúng

### Local build requires Android SDK

```bash
# Install Android Studio
# Set ANDROID_HOME environment variable
# Install Java JDK 17
```

---

## 📱 App Information

### Current Configuration

- **App Name**: Quiz Game
- **Package**: com.quizgame.app (update in app.json)
- **Version**: 1.0.0
- **Min SDK**: 21 (Android 5.0)

### File Sizes (Approximate)

- APK: ~50-80 MB
- AAB: ~30-50 MB (optimized)
- IPA: ~60-100 MB

---

## 🔗 Useful Links

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Dashboard](https://expo.dev/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com/)

---

## 💡 Tips

1. **Always test APK** trước khi build production AAB
2. **Increment version** mỗi lần build mới
3. **Keep build logs** để debug nếu có lỗi
4. **Use preview profile** cho internal testing
5. **Use production profile** chỉ khi ready để release

---

## 🎉 Quick Commands

```bash
# Build APK for testing (recommended)
npm run build:android:preview

# Build AAB for Play Store
npm run build:android

# Build iOS for App Store
npm run build:ios

# Check build status
eas build:list

# View build details
eas build:view [build-id]
```
