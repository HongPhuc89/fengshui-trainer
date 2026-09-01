// Handing a downloaded APK to the system installer (feature-36 §7.3).
//
// A MethodChannel rather than an OTA package: this needs exactly two calls,
// while those packages also bring a downloader that duplicates dio.
//
// An injected instance rather than statics so UpdateCubit stays testable —
// the platform channel is the one thing a unit test cannot reach.

import 'package:flutter/services.dart';
import 'package:injectable/injectable.dart';

@singleton
class AndroidInstaller {
  const AndroidInstaller();

  static const _channel = MethodChannel('pro.huyenhoc.app/installer');

  /// Android 8+ gates the install intent behind a per-app setting.
  Future<bool> canInstall() async =>
      await _channel.invokeMethod<bool>('canRequestInstall') ?? false;

  /// Opens the system settings page where the user grants that permission.
  Future<void> openInstallSettings() =>
      _channel.invokeMethod<void>('openInstallSettings');

  /// Shows the system installer. There is no silent install for a
  /// self-distributed app — the user still confirms.
  Future<void> install(String apkPath) =>
      _channel.invokeMethod<void>('installApk', {'path': apkPath});

  /// Always true below Android 13, where there is no such runtime permission
  /// (feature-35 §2.4).
  Future<bool> hasNotificationPermission() async =>
      await _channel.invokeMethod<bool>('hasNotificationPermission') ?? false;

  /// Resolves to whether the permission was granted. A no-op success(true)
  /// below Android 13.
  Future<bool> requestNotificationPermission() async =>
      await _channel.invokeMethod<bool>('requestNotificationPermission') ?? false;
}
