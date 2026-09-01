// The whole update policy, kept free of Flutter and IO so it can be tested
// directly (feature-37 §6.2).

import 'update_models.dart';

class UpdateDecider {
  const UpdateDecider();

  /// A skipped version stays silent. There is no forced/blocking tier any
  /// more (feature-37 §3.4) — the only two outcomes are "nudge" and "nothing".
  UpdateDecision decide({
    required AppVersionInfo info,
    required int? clientVersionCode,
    required bool isSkipped,
  }) {
    if (clientVersionCode == null) return const NoUpdate();
    if (clientVersionCode >= info.versionCode) return const NoUpdate();
    if (isSkipped) return const NoUpdate();
    return NudgeUpdate(info);
  }
}
