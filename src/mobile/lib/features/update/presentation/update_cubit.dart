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
  UpdateCubit(this._repository, this._store) : super(const UpdateState());

  final UpdateRepository _repository;
  final UpdateStore _store;
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
    emit(state.copyWith(phase: DownloadPhase.downloading, progress: 0, clearError: true));

    try {
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/huyenhoc-${info.versionCode}.apk';

      // The signed URL may simply have expired mid-flight; a fresh one costs one
      // request and avoids blaming the user's network (feature-36 §7.2).
      var url = info.downloadUrl;
      try {
        await _repository.download(url, path, onProgress: _emitProgress);
      } catch (_) {
        url = await _repository.refreshDownloadUrl() ?? url;
        await _repository.download(url, path, onProgress: _emitProgress);
      }

      emit(state.copyWith(phase: DownloadPhase.verifying));
      if (!await _digestMatches(File(path), info.sha256)) {
        await File(path).delete();
        emit(state.copyWith(
          phase: DownloadPhase.failed,
          error: 'File tải về không toàn vẹn. Vui lòng thử lại.',
        ));
        return;
      }

      if (!await AndroidInstaller.canInstall()) {
        emit(state.copyWith(
          phase: DownloadPhase.ready,
          needsInstallPermission: true,
          error: 'Cần cho phép cài đặt từ nguồn này để tiếp tục.',
        ));
        return;
      }

      emit(state.copyWith(phase: DownloadPhase.ready, needsInstallPermission: false));
      await AndroidInstaller.install(path);
    } catch (_) {
      emit(state.copyWith(
        phase: DownloadPhase.failed,
        error: 'Tải bản cập nhật thất bại. Kiểm tra kết nối rồi thử lại.',
      ));
    }
  }

  void _emitProgress(int received, int total) {
    if (total <= 0) return;
    emit(state.copyWith(progress: received / total));
  }

  /// Streamed so a 60MB build never lands in memory in one piece. Catches a
  /// truncated or swapped file — not a compromised server, since the hash comes
  /// from the same place (feature-36 §7.2).
  Future<bool> _digestMatches(File file, String? expected) async {
    if (expected == null || expected.isEmpty) return true;
    final digest = await sha256.bind(file.openRead()).first;
    return digest.toString() == expected;
  }

  Future<void> openInstallSettings() => AndroidInstaller.openInstallSettings();
}
