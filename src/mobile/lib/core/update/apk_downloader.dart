// Talks to ApkDownloadService through the platform channels ApkDownloaderPlugin
// registers on the Android side (feature-35 §3.2, §3.3). Replaces the plain
// Dio download in UpdateRepository — the transfer itself now runs in an
// Android Foreground Service, independent of the Flutter engine.

import 'package:flutter/services.dart';
import 'package:injectable/injectable.dart';

sealed class DownloadEvent {
  const DownloadEvent();
}

class DownloadProgress extends DownloadEvent {
  const DownloadProgress(this.percent, this.received, this.total);
  final int percent;
  final int received;
  final int total;
}

class DownloadCompleted extends DownloadEvent {
  const DownloadCompleted(this.path);
  final String path;
}

class DownloadFailed extends DownloadEvent {
  const DownloadFailed(this.reason);
  final String reason;
}

/// Mirrors ApkDownloadService's persisted state (feature-35 §3.4) — read once
/// at startup so a killed-and-relaunched app does not assume `idle` when the
/// Service already finished (or is still running) in the background.
class DownloadStatus {
  const DownloadStatus({required this.state, this.path, this.versionCode});

  final String state;
  final String? path;
  final int? versionCode;

  bool get isCompleted => state == 'completed';
  bool get isDownloading => state == 'downloading';

  factory DownloadStatus.fromMap(Map<dynamic, dynamic> map) => DownloadStatus(
        state: map['state'] as String? ?? 'idle',
        path: map['path'] as String?,
        versionCode: map['versionCode'] as int?,
      );
}

@singleton
class ApkDownloader {
  const ApkDownloader();

  static const _methodChannel = MethodChannel('pro.huyenhoc.app/downloader');
  static const _eventChannel =
      EventChannel('pro.huyenhoc.app/downloader/events');

  Future<void> startDownload({
    required String url,
    required String? sha256,
    required int versionCode,
  }) =>
      _methodChannel.invokeMethod<void>('startDownload', {
        'url': url,
        'sha256': sha256,
        'versionCode': versionCode,
      });

  Future<DownloadStatus> getDownloadStatus() async {
    final result =
        await _methodChannel.invokeMethod<Map<dynamic, dynamic>>('getDownloadStatus');
    return DownloadStatus.fromMap(result ?? const {});
  }

  /// A broadcast stream: ApkDownloadService may already be running (or have
  /// finished) before anyone subscribes — callers must pair this with
  /// getDownloadStatus() rather than assume the first event is the start of
  /// the download (feature-35 §3.3).
  Stream<DownloadEvent> events() =>
      _eventChannel.receiveBroadcastStream().map(_toEvent);

  DownloadEvent _toEvent(dynamic raw) {
    final map = raw as Map<dynamic, dynamic>;
    return switch (map['type']) {
      'progress' => DownloadProgress(
          map['percent'] as int,
          map['received'] as int,
          map['total'] as int,
        ),
      'completed' => DownloadCompleted(map['path'] as String),
      'failed' => DownloadFailed(map['reason'] as String? ?? 'unknown'),
      _ => DownloadFailed('unknown event: ${map['type']}'),
    };
  }
}
