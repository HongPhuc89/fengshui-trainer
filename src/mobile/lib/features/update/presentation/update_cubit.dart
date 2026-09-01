// Orchestrates the version check, the download and the hand-off to the
// installer (feature-37 §6). The download itself runs in an Android
// Foreground Service (ApkDownloadService) rather than the Dart isolate, so it
// survives the app leaving the foreground or being killed (feature-35 §3).

import 'dart:async';
import 'dart:io';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../../core/update/apk_downloader.dart';
import '../../../core/update/installer.dart';
import '../data/update_repository.dart';
import '../data/update_store.dart';
import '../domain/update_decider.dart';
import '../domain/update_models.dart';

enum DownloadPhase { idle, downloading, verifying, ready, failed }

class UpdateState extends Equatable {
  const UpdateState({
    this.decision = const NoUpdate(),
    this.phase = DownloadPhase.idle,
    this.progress = 0,
    this.error,
    this.needsInstallPermission = false,
  });

  final UpdateDecision decision;
  final DownloadPhase phase;
  final double progress;
  final String? error;
  final bool needsInstallPermission;

  UpdateState copyWith({
    UpdateDecision? decision,
    DownloadPhase? phase,
    double? progress,
    String? error,
    bool? needsInstallPermission,
    bool clearError = false,
  }) =>
      UpdateState(
        decision: decision ?? this.decision,
        phase: phase ?? this.phase,
        progress: progress ?? this.progress,
        error: clearError ? null : (error ?? this.error),
        needsInstallPermission: needsInstallPermission ?? this.needsInstallPermission,
      );

  @override
  List<Object?> get props => [decision, phase, progress, error, needsInstallPermission];
}

@singleton
class UpdateCubit extends Cubit<UpdateState> {
  UpdateCubit(this._repository, this._store, this._installer, this._downloader)
      : super(const UpdateState());

  final UpdateRepository _repository;
  final UpdateStore _store;
  final AndroidInstaller _installer;
  final ApkDownloader _downloader;
  static const _decider = UpdateDecider();

  StreamSubscription<DownloadEvent>? _downloadSubscription;

  /// Never awaited by main(): a slow network must not hold the app on a blank
  /// screen (feature-36 §7.5, unchanged).
  ///
  /// iOS goes through TestFlight entirely outside this app — there is nothing
  /// published for it to check, so this never even calls the API on iOS
  /// (feature-37 §3.5).
  Future<void> check({bool force = true}) async {
    if (Platform.isIOS) return;
    if (!force && !_store.shouldCheck()) return;

    final current = await _repository.currentVersionCode();
    try {
      final info = await _repository.fetch();
      await _store.markChecked();
      if (info == null) {
        emit(state.copyWith(decision: const NoUpdate()));
        return;
      }
      emit(state.copyWith(
        decision: _decider.decide(
          info: info,
          clientVersionCode: current,
          isSkipped: _store.isSkipped(info.versionCode),
        ),
      ));
    } catch (_) {
      // No forced/blocking tier left to preserve (feature-37 §3.4) — a failed
      // check simply keeps whatever the last successful one decided, and
      // tries again on the next check (app open / 6h resume).
    }
  }

  Future<void> skip(int versionCode) async {
    await _store.skip(versionCode,
        currentVersionCode: await _repository.currentVersionCode());
    emit(state.copyWith(decision: const NoUpdate()));
  }

  /// Read-only refresh of needsInstallPermission — called when the dialog
  /// opens and again on every app resume, since the user may have just come
  /// back from the system settings screen (feature-35 §5.5).
  Future<void> checkInstallPermission() async {
    final canInstall = await _installer.canInstall();
    emit(state.copyWith(needsInstallPermission: !canInstall));
  }

  Future<void> startUpdate(AppVersionInfo info) => _downloadAndInstall(info);

  Future<void> _downloadAndInstall(AppVersionInfo info) async {
    // Asked before downloading, not after: 160MB is a lot to spend on a build
    // the system will then refuse to install.
    if (!await _installer.canInstall()) {
      emit(state.copyWith(
        phase: DownloadPhase.idle,
        needsInstallPermission: true,
        error: 'Cần cho phép cài đặt từ nguồn này, sau đó bấm Cập nhật lại.',
      ));
      return;
    }

    // A resumable download already sitting on disk from a previous attempt —
    // ApkDownloadService checks this itself too, but asking first here saves
    // starting the Service (and re-requesting the notification permission)
    // for nothing when the file is already there and verified.
    final resumedStatus = await _downloader.getDownloadStatus();
    if (resumedStatus.isCompleted &&
        resumedStatus.versionCode == info.versionCode &&
        resumedStatus.path != null &&
        await File(resumedStatus.path!).exists()) {
      emit(state.copyWith(phase: DownloadPhase.ready, progress: 1, clearError: true));
      await _installer.install(resumedStatus.path!);
      return;
    }

    // Contextual, one-shot ask — right before the download starts, not
    // earlier (feature-35 §5.3). A decline still lets the download run; it
    // just means no system notification (Service still runs as Foreground).
    if (!await _installer.hasNotificationPermission()) {
      await _installer.requestNotificationPermission();
    }

    emit(state.copyWith(
      phase: DownloadPhase.downloading,
      progress: 0,
      needsInstallPermission: false,
      clearError: true,
    ));

    await _downloadSubscription?.cancel();
    _downloadSubscription = _downloader.events().listen(_onDownloadEvent);

    try {
      await _downloader.startDownload(
        url: info.downloadUrl,
        sha256: info.sha256,
        versionCode: info.versionCode,
      );
    } catch (_) {
      emit(state.copyWith(
        phase: DownloadPhase.failed,
        error: 'Tải bản cập nhật thất bại. Kiểm tra kết nối rồi thử lại.',
      ));
    }
  }

  void _onDownloadEvent(DownloadEvent event) {
    switch (event) {
      case DownloadProgress(:final percent):
        emit(state.copyWith(progress: percent / 100));
      case DownloadCompleted(:final path):
        emit(state.copyWith(phase: DownloadPhase.ready, progress: 1));
        unawaited(_installer.install(path));
      case DownloadFailed():
        // Includes a signed URL expiring mid-transfer: unlike the old
        // Dio-in-Dart download, ApkDownloadService gets one URL at start and
        // cannot ask the API for a fresh one itself. Accepted trade-off for
        // v1 — tapping "Cập nhật" again re-fetches a fresh URL from scratch
        // (feature-35, PO-approved).
        emit(state.copyWith(
          phase: DownloadPhase.failed,
          error: 'Tải bản cập nhật thất bại. Kiểm tra kết nối rồi thử lại.',
        ));
    }
  }

  /// Called once at startup (feature-35 §3.4) — recovers from the case where
  /// ApkDownloadService finished (or is still running) while the app was
  /// killed, so the Dart-side state does not default to `idle` and make the
  /// user download the same build again.
  Future<void> restoreDownloadState() async {
    final status = await _downloader.getDownloadStatus();
    if (status.isCompleted && status.path != null && await File(status.path!).exists()) {
      emit(state.copyWith(phase: DownloadPhase.ready, progress: 1));
    } else if (status.isDownloading) {
      emit(state.copyWith(phase: DownloadPhase.downloading));
      await _downloadSubscription?.cancel();
      _downloadSubscription = _downloader.events().listen(_onDownloadEvent);
    }
  }

  Future<void> openInstallSettings() => _installer.openInstallSettings();

  @override
  Future<void> close() {
    _downloadSubscription?.cancel();
    return super.close();
  }
}
