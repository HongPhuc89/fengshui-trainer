# thienthu

A new Flutter project.

## Building a production APK

Before running `flutter build apk`, bump the build number past whatever
version is currently published on the server, so the APK you build never
collides with a `version_code` already live (Android refuses installing over
a lower `version_code`):

```bash
cd src/mobile
dart run scripts/bump_version.dart          # keep version name, bump build number only
dart run scripts/bump_version.dart 1.0.4    # also set a new version name
flutter build apk --release --dart-define-from-file=env.prod.json
```

This edits `pubspec.yaml` in place — review the diff and commit it once the
build is confirmed good. See `scripts/bump_version.dart` for details.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
