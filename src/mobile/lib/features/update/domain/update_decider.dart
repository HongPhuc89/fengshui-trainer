// The whole update policy, kept free of Flutter and IO so it can be tested
// directly (feature-36 §7.5, §7.7).

import 'update_models.dart';

class UpdateDecider {
  const UpdateDecider();

  /// Decide from a live answer.
  ///
  /// A skipped version is silent, but skipping never beats a block: "I looked
  /// and said no" cannot outrank "this build is no longer supported".
  UpdateDecision fromServer({
    required AppVersionInfo info,
    required int? clientVersionCode,
    required bool isSkipped,
  }) {
    final status = info.statusFor(clientVersionCode);
    return switch (status) {
      UpdateStatus.blocked => BlockUpdate(info),
      UpdateStatus.available => isSkipped ? const NoUpdate() : NudgeUpdate(info),
      UpdateStatus.upToDate => const NoUpdate(),
    };
  }

  /// Decide when the check could not reach the server.
  ///
  /// Only a successful response may loosen a verdict. Without this, turning the
  /// network off would be enough to walk past the block screen — and since
  /// feature-36 §6.3 dropped the server-side gate, this is the only thing
  /// holding it.
  UpdateDecision fromStoredVerdict({
    required LastVerdict? verdict,
    required int? clientVersionCode,
  }) {
    if (verdict == null || clientVersionCode == null) return const NoUpdate();
    if (clientVersionCode >= verdict.minSupportedVersionCode) return const NoUpdate();

    // downloadUrl is empty on purpose: the screen has to say "thử lại" rather
    // than offer a link this build never received.
    return BlockUpdate(AppVersionInfo(
      versionCode: verdict.latestVersionCode,
      versionName: '',
      minSupportedVersionCode: verdict.minSupportedVersionCode,
      downloadUrl: '',
    ));
  }
}
