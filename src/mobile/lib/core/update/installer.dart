// Handing a downloaded APK to the system installer (feature-36 §7.3).
//
// A MethodChannel rather than an OTA package: this needs exactly two calls,
// while those packages also bring a downloader that duplicates dio.

import 'package:flutter/services.dart';

class AndroidInstaller {
  static const _channel = MethodChannel('pro.huyenhoc.app/installer');

  /// Android 8+ gates the install intent behind a per-app setting.
  static Future<bool> canInstall() async =>
      await _channel.invokeMethod<bool>('canRequestInstall') ?? false;

  /// Opens the system settings page where the user grants that permission.
  static Future<void> openInstallSettings() =>
      _channel.invokeMethod<void>('openInstallSettings');

  /// Shows the system installer. There is no silent install for a
  /// self-distributed app — the user still confirms.
  static Future<void> install(String apkPath) =>
      _channel.invokeMethod<void>('installApk', {'path': apkPath});
}
