// Talks to GET /api/app/version/ (feature-37 §5.2).

import 'dart:io';

import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../core/api/api_client.dart';
import '../domain/update_models.dart';

@singleton
class UpdateRepository {
  UpdateRepository(this._api);

  final ApiClient _api;

  /// The running build number, or null when it cannot be read.
  ///
  /// buildNumber is a String and a misconfigured build can put anything in it.
  /// Callers must treat null as "unknown" and never block on it.
  Future<int?> currentVersionCode() async {
    final info = await PackageInfo.fromPlatform();
    return int.tryParse(info.buildNumber);
  }

  /// Null when the server has nothing published (204). No query params: there
  /// is only one platform (Android) and the server no longer computes a
  /// verdict — the caller compares version_code itself (feature-37 §5.2).
  Future<AppVersionInfo?> fetch() async {
    final response = await _api.get<Map<String, dynamic>>('/app/version/');
    if (response.statusCode == HttpStatus.noContent || response.data == null) {
      return null;
    }
    return AppVersionInfo.fromJson(response.data!);
  }

  /// Fresh signed URL for a retry: the previous one may simply have expired,
  /// and retrying a dead URL fails forever while blaming the user's network
  /// (feature-36 §7.2, unchanged).
  Future<String?> refreshDownloadUrl() async {
    final info = await fetch();
    return info?.downloadUrl;
  }

  Future<void> download(
    String url,
    String savePath, {
    void Function(int received, int total)? onProgress,
    CancelToken? cancelToken,
  }) =>
      Dio().download(url, savePath,
          onReceiveProgress: onProgress, cancelToken: cancelToken);
}
