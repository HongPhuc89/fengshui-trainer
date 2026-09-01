import 'package:flutter/foundation.dart';
import 'package:screen_protector/screen_protector.dart';

/// Screenshot and screen-recording protection, applied in release builds only.
///
/// Debug and profile builds leave it off on purpose. The protection makes the
/// screen come back blank to `adb screencap`, screen recorders and the OS app
/// switcher — which hides the very screen a developer is trying to look at, and
/// makes bug reports impossible to illustrate.
///
/// Every call site goes through here rather than calling ScreenProtector
/// directly, so the policy lives in one place and cannot drift.
class ScreenGuard {
  ScreenGuard._();

  /// True only in a release build. Profile builds count as development.
  static bool get isEnforced => kReleaseMode;

  /// Block screenshots and screen recording for the whole app.
  static Future<void> preventCapture() async {
    if (!isEnforced) return;
    await ScreenProtector.preventScreenshotOn();
  }

  /// Blur the app in the task switcher, for screens showing licensed content.
  static Future<void> protectDataLeakage() async {
    if (!isEnforced) return;
    await ScreenProtector.protectDataLeakageOn();
  }

  /// Undo [protectDataLeakage] when leaving such a screen.
  static Future<void> allowDataLeakage() async {
    if (!isEnforced) return;
    await ScreenProtector.protectDataLeakageOff();
  }
}
