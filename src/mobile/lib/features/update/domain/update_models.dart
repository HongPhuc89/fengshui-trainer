// Version-check models (feature-37 §6.2).

/// What the server said about the current Android build.
class AppVersionInfo {
  const AppVersionInfo({
    required this.versionCode,
    required this.versionName,
    required this.downloadUrl,
    this.releaseNotes = '',
    this.fileSize,
    this.sha256,
  });

  final int versionCode;
  final String versionName;
  final String downloadUrl;
  final String releaseNotes;
  final int? fileSize;
  final String? sha256;

  factory AppVersionInfo.fromJson(Map<String, dynamic> json) => AppVersionInfo(
        versionCode: json['version_code'] as int,
        versionName: json['version_name'] as String? ?? '',
        downloadUrl: json['download_url'] as String? ?? '',
        releaseNotes: json['release_notes'] as String? ?? '',
        fileSize: json['file_size'] as int?,
        sha256: json['sha256'] as String?,
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
