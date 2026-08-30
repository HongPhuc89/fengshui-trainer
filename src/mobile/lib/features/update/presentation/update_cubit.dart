// Orchestrates the version check, the download and the hand-off to the
// installer (feature-36 §7).

import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

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
  /// screen (feature-36 §7.5).
  Future<void> check({bool force = true}) async {
    if (!force && !_store.shouldCheck()) return;

    final current = await _repository.currentVersionCode();
    try {
      final info = await _repository.fetch(current);
      await _store.markChecked();
      if (info == null) {
        emit(state.copyWith(decision: const NoUpdate()));
        return;
      }
      await _store.writeVerdict(info);
      emit(state.copyWith(
        decision: _decider.fromServer(
          info: info,
          clientVersionCode: current,
          isSkipped: _store.isSkipped(info.versionCode),
        ),
      ));
    } catch (_) {
      // Falls back to what the server last said. Only a successful response may
      // loosen a verdict, so losing the network cannot unlock a blocked build.
      emit(state.copyWith(
        decision: _decider.fromStoredVerdict(
          verdict: _store.readVerdict(),
          clientVersionCode: current,
        ),
      ));
    }
  }

  Future<void> skip(int versionCode) async {
    await _store.skip(versionCode,
        currentVersionCode: await _repository.currentVersionCode());
    emit(state.copyWith(decision: const NoUpdate()));
  }

  /// iOS hands the whole job to the OS; Android downloads and verifies first.
  Future<void> startUpdate(AppVersionInfo info) async {
    if (Platform.isIOS) {
      await launchUrl(Uri.parse(info.downloadUrl), mode: LaunchMode.externalApplication);
      return;
    }
    await _downloadAndInstall(info);
  }

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
  /// request and avoids blaming the user's network (feature-36 §7.2).
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
  /// from the same place (feature-36 §7.2).
  Future<bool> _matchesDigest(File file, String expected) async {
    final digest = await sha256.bind(file.openRead()).first;
    return digest.toString() == expected;
  }

  Future<void> openInstallSettings() => _installer.openInstallSettings();
}
