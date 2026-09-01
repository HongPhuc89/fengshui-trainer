// Orchestrates the version check, the download and the hand-off to the
// installer (feature-37 §6).

import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:path_provider/path_provider.dart';

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
  UpdateCubit(this._repository, this._store, this._installer)
      : super(const UpdateState());

  final UpdateRepository _repository;
  final UpdateStore _store;
  final AndroidInstaller _installer;
  static const _decider = UpdateDecider();

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

    emit(state.copyWith(
      phase: DownloadPhase.downloading,
      progress: 0,
      needsInstallPermission: false,
      clearError: true,
    ));

    try {
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/huyenhoc-${info.versionCode}.apk');
      final expected = info.sha256 ?? '';

      // A retry — after the permission prompt, or after the user backed out of
      // the system installer — must not pay for the download a second time. The
      // digest is what makes reuse safe: a half-written file never matches.
      final reusable = expected.isNotEmpty &&
          await file.exists() &&
          await _matchesDigest(file, expected);

      if (!reusable) {
        await _fetch(info, file.path);
        if (expected.isNotEmpty) {
          emit(state.copyWith(phase: DownloadPhase.verifying));
          if (!await _matchesDigest(file, expected)) {
            await file.delete();
            emit(state.copyWith(
              phase: DownloadPhase.failed,
              error: 'File tải về không toàn vẹn. Vui lòng thử lại.',
            ));
            return;
          }
        }
      }

      emit(state.copyWith(phase: DownloadPhase.ready, progress: 1));
      await _installer.install(file.path);
    } catch (_) {
      emit(state.copyWith(
        phase: DownloadPhase.failed,
        error: 'Tải bản cập nhật thất bại. Kiểm tra kết nối rồi thử lại.',
      ));
    }
  }

  /// The signed URL may simply have expired mid-flight; a fresh one costs one
  /// request and avoids blaming the user's network (feature-36 §7.2, unchanged).
  Future<void> _fetch(AppVersionInfo info, String path) async {
    try {
      await _repository.download(info.downloadUrl, path, onProgress: _emitProgress);
    } catch (_) {
      final fresh = await _repository.refreshDownloadUrl() ?? info.downloadUrl;
      await _repository.download(fresh, path, onProgress: _emitProgress);
    }
  }

  void _emitProgress(int received, int total) {
    if (total <= 0) return;
    emit(state.copyWith(progress: received / total));
  }

  /// Streamed so a 160MB build never lands in memory in one piece. Catches a
  /// truncated or swapped file — not a compromised server, since the hash comes
  /// from the same place (feature-36 §7.2, unchanged).
  Future<bool> _matchesDigest(File file, String expected) async {
    final digest = await sha256.bind(file.openRead()).first;
    return digest.toString() == expected;
  }

  Future<void> openInstallSettings() => _installer.openInstallSettings();
}
