// The update policy (feature-37 §6.2). Pure logic, no IO.

import 'package:flutter_test/flutter_test.dart';
import 'package:huyenhoc/features/update/domain/update_decider.dart';
import 'package:huyenhoc/features/update/domain/update_models.dart';

AppVersionInfo info({int latest = 12}) => AppVersionInfo(
      versionCode: latest,
      versionName: '1.2.0',
      downloadUrl: 'https://example.test/app.apk',
    );

void main() {
  const decider = UpdateDecider();

  test('T37-11: a newer release nudges when not skipped', () {
    final decision = decider.decide(
      info: info(),
      clientVersionCode: 9,
      isSkipped: false,
    );
    expect(decision, isA<NudgeUpdate>());
  });

  test('T37-12: a skipped version stays silent', () {
    final decision = decider.decide(
      info: info(),
      clientVersionCode: 9,
      isSkipped: true,
    );
    expect(decision, isA<NoUpdate>());
  });

  test('T37-13: up to date shows nothing', () {
    final decision = decider.decide(
      info: info(),
      clientVersionCode: 12,
      isSkipped: false,
    );
    expect(decision, isA<NoUpdate>());
  });

  test('a newer release asks again once the server offers a build past the skip', () {
    // The skip was recorded against 12; the server now offers 13.
    final decision = decider.decide(
      info: info(latest: 13),
      clientVersionCode: 9,
      isSkipped: false,
    );
    expect(decision, isA<NudgeUpdate>());
  });

  test('an unreadable build number never nudges', () {
    // Locking every user out over a parse slip is far worse than letting an
    // old build in (feature-36 §4.1, unchanged reasoning).
    expect(
      decider.decide(info: info(), clientVersionCode: null, isSkipped: false),
      isA<NoUpdate>(),
    );
  });
}
