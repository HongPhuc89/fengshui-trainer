import 'dart:convert';
import 'dart:io';

import 'package:android_id/android_id.dart';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:uuid/uuid.dart';

/// Everything the backend needs to recognise this handset.
class DeviceMeta {
  const DeviceMeta({
    required this.deviceId,
    required this.platformOs,
    required this.deviceName,
    this.hardwareHash,
    this.deviceModel,
    this.osVersion,
    this.appVersion,
  });

  final String deviceId;
  final String platformOs;
  final String deviceName;
  final String? hardwareHash;
  final String? deviceModel;
  final String? osVersion;
  final String? appVersion;

  Map<String, dynamic> toJson() => {
        'device_id': deviceId,
        'platform_os': platformOs,
        'device_name': deviceName,
        if (hardwareHash != null) 'hardware_hash': hardwareHash,
        if (deviceModel != null) 'device_model': deviceModel,
        if (osVersion != null) 'os_version': osVersion,
        if (appVersion != null) 'app_version': appVersion,
      };
}

@singleton
class DeviceService {
  static const _deviceIdKey = 'device_stable_id';
  static const _pairedKey = 'handset_paired';
  static const _reportedAppVersionKey = 'reported_app_version';

  /// Keep the identifier device-local. An iCloud-synced Keychain entry would
  /// hand the same client id to a second phone, which the server then has to
  /// detect and reject as a cloned device.
  static const _iosOptions = IOSOptions(
    accessibility: KeychainAccessibility.first_unlock_this_device,
    synchronizable: false,
  );

  /// resetOnError keeps the app usable if the Keystore entry is unreadable after
  /// a restore; a lost id degrades to a re-bind, an unusable app does not.
  static const _androidOptions = AndroidOptions(
    encryptedSharedPreferences: true,
    resetOnError: true,
  );

  final FlutterSecureStorage _secureStorage;
  final DeviceInfoPlugin _deviceInfo;

  DeviceService(this._secureStorage) : _deviceInfo = DeviceInfoPlugin();

  /// Sent as `platform_os` to /auth/mobile/login/.
  String get platformOs => Platform.isIOS ? 'ios' : 'android';

  /// Stable, opaque client id, generated once and kept in Keychain / Keystore.
  ///
  /// Contains no underscores, so it can never be mistaken for a web device key
  /// on the server side.
  Future<String> getDeviceId() async {
    final stored = await _secureStorage.read(
      key: _deviceIdKey,
      iOptions: _iosOptions,
      aOptions: _androidOptions,
    );
    if (stored != null && stored.isNotEmpty) return stored;

    final newId = const Uuid().v4();
    await _secureStorage.write(
      key: _deviceIdKey,
      value: newId,
      iOptions: _iosOptions,
      aOptions: _androidOptions,
    );
    return newId;
  }

  /// Whether this install has ever completed a login.
  ///
  /// Drives whether the login form offers the pairing-code field up front. A
  /// reinstall loses the flag and the field comes back — harmless, because the
  /// field is optional and the server still decides via the hardware anchor.
  Future<bool> hasPairedBefore() async {
    final value = await _secureStorage.read(
        key: _pairedKey, iOptions: _iosOptions, aOptions: _androidOptions);
    return value == '1';
  }

  Future<void> markPaired() async {
    await _secureStorage.write(
        key: _pairedKey, value: '1', iOptions: _iosOptions, aOptions: _androidOptions);
  }

  /// The app_version last successfully reported to the backend, or null if
  /// never reported (or the app was reinstalled — secure storage cleared).
  Future<String?> lastReportedAppVersion() async {
    return _secureStorage.read(
        key: _reportedAppVersionKey, iOptions: _iosOptions, aOptions: _androidOptions);
  }

  Future<void> markAppVersionReported(String version) async {
    await _secureStorage.write(
        key: _reportedAppVersionKey, value: version,
        iOptions: _iosOptions, aOptions: _androidOptions);
  }

  /// Hardware anchor that outlives an app reinstall, so a user who reinstalls is
  /// recognised as the same handset instead of being sent to ask for a code.
  ///
  /// Returns null when the platform value is missing; the server then treats the
  /// login as a brand-new device.
  Future<String?> getHardwareHash() async {
    try {
      final raw = Platform.isIOS
          ? (await _deviceInfo.iosInfo).identifierForVendor
          : await const AndroidId().getId();
      if (raw == null || raw.isEmpty) return null;
      return sha256.convert(utf8.encode(raw)).toString();
    } catch (_) {
      return null;
    }
  }

  Future<String> getDeviceName() async {
    if (Platform.isIOS) {
      final ios = await _deviceInfo.iosInfo;
      return '${ios.name} (${ios.systemVersion})';
    }
    final android = await _deviceInfo.androidInfo;
    return '${android.model} (Android ${android.version.release})';
  }

  /// Collect the full payload in one pass so callers make a single await.
  Future<DeviceMeta> getMeta() async {
    final deviceId = await getDeviceId();
    final hardwareHash = await getHardwareHash();
    final packageInfo = await PackageInfo.fromPlatform();

    String? model;
    String? osVersion;
    if (Platform.isIOS) {
      final ios = await _deviceInfo.iosInfo;
      model = ios.utsname.machine;
      osVersion = 'iOS ${ios.systemVersion}';
    } else {
      final android = await _deviceInfo.androidInfo;
      model = android.model;
      osVersion = 'Android ${android.version.release}';
    }

    return DeviceMeta(
      deviceId: deviceId,
      platformOs: platformOs,
      deviceName: await getDeviceName(),
      hardwareHash: hardwareHash,
      deviceModel: model,
      osVersion: osVersion,
      appVersion: '${packageInfo.version}+${packageInfo.buildNumber}',
    );
  }
}
