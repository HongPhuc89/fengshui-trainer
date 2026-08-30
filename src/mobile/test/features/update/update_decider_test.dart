// The update policy (feature-36 §7.5, §7.7). Pure logic, no IO.

import 'package:flutter_test/flutter_test.dart';
import 'package:huyenhoc/features/update/domain/update_decider.dart';
import 'package:huyenhoc/features/update/domain/update_models.dart';

AppVersionInfo info({int latest = 12, int min = 8, String? status}) => AppVersionInfo(
      versionCode: latest,
      versionName: '1.2.0',
      minSupportedVersionCode: min,
      downloadUrl: 'https://example.test/app.apk',
      status: updateStatusFrom(status),
    );

void main() {
  const decider = UpdateDecider();

  group('live answer', () {
    test('T36-21: a skipped version stays silent', () {
      final decision = decider.fromServer(
        info: info(status: 'AVAILABLE'),
        clientVersionCode: 9,
        isSkipped: true,
      );
      expect(decision, isA<NoUpdate>());
    });

    test('T36-22: a newer release asks again even after a skip', () {
      // The skip was recorded against 12; the server now offers 13.
      final decision = decider.fromServer(
        info: info(latest: 13, status: 'AVAILABLE'),
        clientVersionCode: 9,
        isSkipped: false,
      );
      expect(decision, isA<NudgeUpdate>());
    });

    test('T36-23: skipping never beats a block', () {
      final decision = decider.fromServer(
        info: info(min: 12, status: 'BLOCKED'),
        clientVersionCode: 9,
        isSkipped: true,
      );
      expect(decision, isA<BlockUpdate>());
    });

    test('up to date shows nothing', () {
      final decision = decider.fromServer(
        info: info(status: 'UP_TO_DATE'),
        clientVersionCode: 12,
        isSkipped: false,
      );
      expect(decision, isA<NoUpdate>());
    });

    test('falls back to comparing numbers when the server sent no verdict', () {
      expect(
        decider.fromServer(info: info(), clientVersionCode: 7, isSkipped: false),
        isA<BlockUpdate>(),
      );
      expect(
        decider.fromServer(info: info(), clientVersionCode: 9, isSkipped: false),
        isA<NudgeUpdate>(),
      );
    });

    test('an unreadable build number never blocks', () {
      // Locking every user out over a parse slip is far worse than letting an
      // old build in (feature-36 §4.1).
      expect(
        decider.fromServer(info: info(), clientVersionCode: null, isSkipped: false),
        isA<NoUpdate>(),
      );
    });
  });

  group('check failed — stored verdict', () {
    test('T36-11: a stored block survives a failed check', () {
      final decision = decider.fromStoredVerdict(
        verdict: const LastVerdict(minSupportedVersionCode: 12, latestVersionCode: 12),
        clientVersionCode: 9,
      );
      expect(decision, isA<BlockUpdate>());
      // No live answer means no download link, so the screen offers a retry.
      expect((decision as BlockUpdate).isStale, isTrue);
    });

    test('T36-25: a stored nudge stays silent', () {
      final decision = decider.fromStoredVerdict(
        verdict: const LastVerdict(minSupportedVersionCode: 8, latestVersionCode: 12),
        clientVersionCode: 9,
      );
      expect(decision, isA<NoUpdate>());
    });

    test('T36-26: a fresh install with no stored verdict is let through', () {
      expect(
        decider.fromStoredVerdict(verdict: null, clientVersionCode: 9),
        isA<NoUpdate>(),
      );
    });

    test('unknown client version is let through', () {
      expect(
        decider.fromStoredVerdict(
          verdict: const LastVerdict(minSupportedVersionCode: 12, latestVersionCode: 12),
          clientVersionCode: null,
        ),
        isA<NoUpdate>(),
      );
    });

    test('T36-27: a successful response is what loosens the verdict', () {
      // Same client, same stored block — but the server has lowered the floor.
      final live = decider.fromServer(
        info: info(min: 8, status: 'AVAILABLE'),
        clientVersionCode: 9,
        isSkipped: false,
      );
      expect(live, isA<NudgeUpdate>());
    });
  });
}
