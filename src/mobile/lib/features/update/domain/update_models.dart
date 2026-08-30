// Version-check models (feature-36 §6.1, §7.7).

enum UpdateStatus { blocked, available, upToDate }

UpdateStatus? updateStatusFrom(String? raw) => switch (raw) {
      'BLOCKED' => UpdateStatus.blocked,
      'AVAILABLE' => UpdateStatus.available,
      'UP_TO_DATE' => UpdateStatus.upToDate,
      _ => null,
    };

/// What the server said about the newest build for this platform.
class AppVersionInfo {
  const AppVersionInfo({
    required this.versionCode,
    required this.versionName,
    required this.minSupportedVersionCode,
    required this.downloadUrl,
    this.status,
    this.releaseNotes = '',
    this.fileSize,
    this.sha256,
  });

  final int versionCode;
  final String versionName;
  final int minSupportedVersionCode;
  final String downloadUrl;
  final UpdateStatus? status;
  final String releaseNotes;
  final int? fileSize;
  final String? sha256;

  factory AppVersionInfo.fromJson(Map<String, dynamic> json) => AppVersionInfo(
        versionCode: json['version_code'] as int,
        versionName: json['version_name'] as String? ?? '',
        minSupportedVersionCode: json['min_supported_version_code'] as int? ?? 0,
        downloadUrl: json['download_url'] as String? ?? '',
        status: updateStatusFrom(json['update_status'] as String?),
        releaseNotes: json['release_notes'] as String? ?? '',
        fileSize: json['file_size'] as int?,
        sha256: json['sha256'] as String?,
      );

  /// Falls back to comparing numbers when the server did not send a verdict —
  /// it only omits one when the client did not report its own version.
  UpdateStatus statusFor(int? clientVersionCode) {
    if (status != null) return status!;
    if (clientVersionCode == null) return UpdateStatus.upToDate;
    if (clientVersionCode < minSupportedVersionCode) return UpdateStatus.blocked;
    if (clientVersionCode < versionCode) return UpdateStatus.available;
    return UpdateStatus.upToDate;
  }
}

/// The last verdict the server gave, kept so a failed check cannot silently
/// downgrade a blocked client back to usable (feature-36 §7.5).
class LastVerdict {
  const LastVerdict({
    required this.minSupportedVersionCode,
    required this.latestVersionCode,
  });

  final int minSupportedVersionCode;
  final int latestVersionCode;

  Map<String, dynamic> toJson() => {
        'min': minSupportedVersionCode,
        'latest': latestVersionCode,
      };

  factory LastVerdict.fromJson(Map<String, dynamic> json) => LastVerdict(
        minSupportedVersionCode: json['min'] as int? ?? 0,
        latestVersionCode: json['latest'] as int? ?? 0,
      );
}

/// What the update flow should show right now.
sealed class UpdateDecision {
  const UpdateDecision();
}

class NoUpdate extends UpdateDecision {
  const NoUpdate();
}

class NudgeUpdate extends UpdateDecision {
  const NudgeUpdate(this.info);
  final AppVersionInfo info;
}

class BlockUpdate extends UpdateDecision {
  const BlockUpdate(this.info);
  final AppVersionInfo info;

  /// True when the block comes from a stored verdict rather than a live answer,
  /// so the screen can offer a retry instead of a download.
  bool get isStale => info.downloadUrl.isEmpty;
}
