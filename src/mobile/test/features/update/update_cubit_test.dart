// Download and install retries (feature-36 §7.2, §7.3; feature-35 §3.4, §5.3,
// §5.5). The transfer itself is delegated to ApkDownloader (backed by
// ApkDownloadService on the platform side) — these tests drive it through a
// fake event stream rather than touching the real platform channel.

import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:huyenhoc/core/update/apk_downloader.dart';
import 'package:huyenhoc/core/update/installer.dart';
import 'package:huyenhoc/features/update/data/update_repository.dart';
import 'package:huyenhoc/features/update/data/update_store.dart';
import 'package:huyenhoc/features/update/domain/update_models.dart';
import 'package:huyenhoc/features/update/presentation/update_cubit.dart';
import 'package:mocktail/mocktail.dart';

class MockRepository extends Mock implements UpdateRepository {}

class MockInstaller extends Mock implements AndroidInstaller {}

class MockApkDownloader extends Mock implements ApkDownloader {}

AppVersionInfo infoWith({String? digest}) => AppVersionInfo(
      versionCode: 2,
      versionName: '1.0.1',
      downloadUrl: 'http://server.test/huyenhoc-2.apk',
      sha256: digest,
    );

void main() {
  late Directory dir;
  late MockRepository repository;
  late MockInstaller installer;
  late MockApkDownloader downloader;
  late UpdateStore store;
  late UpdateCubit cubit;
  late StreamController<DownloadEvent> events;

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('update_cubit_test');
    Hive.init(dir.path);

    repository = MockRepository();
    installer = MockInstaller();
    downloader = MockApkDownloader();
    store = UpdateStore();
    await store.init();

    events = StreamController<DownloadEvent>.broadcast();
    when(() => downloader.events()).thenAnswer((_) => events.stream);
    when(() => downloader.getDownloadStatus()).thenAnswer(
      (_) async => const DownloadStatus(state: 'idle'),
    );
    when(() => downloader.startDownload(
          url: any(named: 'url'),
          sha256: any(named: 'sha256'),
          versionCode: any(named: 'versionCode'),
        )).thenAnswer((_) async {});

    when(() => installer.install(any())).thenAnswer((_) async {});
    when(() => installer.hasNotificationPermission()).thenAnswer((_) async => true);
    when(() => installer.requestNotificationPermission()).thenAnswer((_) async => true);
    when(() => repository.currentVersionCode()).thenAnswer((_) async => 1);

    cubit = UpdateCubit(repository, store, installer, downloader);
  });

  tearDown(() async {
    await cubit.close();
    await events.close();
    await Hive.deleteFromDisk();
    await dir.delete(recursive: true);
  });

  group('startUpdate()', () {
    test('no install permission means nothing is downloaded at all', () async {
      when(() => installer.canInstall()).thenAnswer((_) async => false);

      await cubit.startUpdate(infoWith());

      verifyNever(() => downloader.startDownload(
            url: any(named: 'url'),
            sha256: any(named: 'sha256'),
            versionCode: any(named: 'versionCode'),
          ));
      expect(cubit.state.needsInstallPermission, isTrue);
      expect(cubit.state.phase, DownloadPhase.idle);
    });

    test('a completed download already on disk is installed without downloading again',
        () async {
      // The exact case from the device: permission granted after the first
      // attempt, then "Cập nhật" tapped again while the Service already has
      // a verified file for this version.
      when(() => installer.canInstall()).thenAnswer((_) async => true);
      final apkFile = File('${dir.path}/huyenhoc-2.apk')..writeAsStringSync('apk-bytes');
      when(() => downloader.getDownloadStatus()).thenAnswer(
        (_) async => DownloadStatus(state: 'completed', path: apkFile.path, versionCode: 2),
      );

      await cubit.startUpdate(infoWith());

      verifyNever(() => downloader.startDownload(
            url: any(named: 'url'),
            sha256: any(named: 'sha256'),
            versionCode: any(named: 'versionCode'),
          ));
      verify(() => installer.install(apkFile.path)).called(1);
      expect(cubit.state.phase, DownloadPhase.ready);
    });

    test('starts the Service and reflects progress events', () async {
      when(() => installer.canInstall()).thenAnswer((_) async => true);

      await cubit.startUpdate(infoWith());
      expect(cubit.state.phase, DownloadPhase.downloading);

      events.add(const DownloadProgress(42, 420, 1000));
      await Future<void>.delayed(Duration.zero);

      expect(cubit.state.progress, closeTo(0.42, 0.001));
    });

    test('a completed event installs the file', () async {
      when(() => installer.canInstall()).thenAnswer((_) async => true);

      await cubit.startUpdate(infoWith());
      events.add(const DownloadCompleted('/data/huyenhoc-2.apk'));
      await Future<void>.delayed(Duration.zero);

      expect(cubit.state.phase, DownloadPhase.ready);
      verify(() => installer.install('/data/huyenhoc-2.apk')).called(1);
    });

    test('a failed event surfaces an error without touching the installer', () async {
      when(() => installer.canInstall()).thenAnswer((_) async => true);

      await cubit.startUpdate(infoWith());
      events.add(const DownloadFailed('sha256 mismatch'));
      await Future<void>.delayed(Duration.zero);

      expect(cubit.state.phase, DownloadPhase.failed);
      verifyNever(() => installer.install(any()));
    });

    test(
        'declining the notification permission still starts the download (feature-35 §5.3)',
        () async {
      when(() => installer.canInstall()).thenAnswer((_) async => true);
      when(() => installer.hasNotificationPermission()).thenAnswer((_) async => false);
      when(() => installer.requestNotificationPermission()).thenAnswer((_) async => false);

      await cubit.startUpdate(infoWith());

      verify(() => downloader.startDownload(
            url: any(named: 'url'),
            sha256: any(named: 'sha256'),
            versionCode: any(named: 'versionCode'),
          )).called(1);
      expect(cubit.state.phase, DownloadPhase.downloading);
    });
  });

  group('checkInstallPermission() (feature-35 §5.5)', () {
    test('reflects the current permission state without touching phase or progress',
        () async {
      when(() => installer.canInstall()).thenAnswer((_) async => false);

      await cubit.checkInstallPermission();

      expect(cubit.state.needsInstallPermission, isTrue);
      expect(cubit.state.phase, DownloadPhase.idle);
    });

    test('flips back once permission has been granted', () async {
      when(() => installer.canInstall()).thenAnswer((_) async => false);
      await cubit.checkInstallPermission();
      expect(cubit.state.needsInstallPermission, isTrue);

      when(() => installer.canInstall()).thenAnswer((_) async => true);
      await cubit.checkInstallPermission();

      expect(cubit.state.needsInstallPermission, isFalse);
    });
  });

  group('restoreDownloadState() (feature-35 §3.4)', () {
    test('a completed download recovered after the app was killed skips to ready',
        () async {
      final apkFile = File('${dir.path}/huyenhoc-2.apk')..writeAsStringSync('apk-bytes');
      when(() => downloader.getDownloadStatus()).thenAnswer(
        (_) async => DownloadStatus(state: 'completed', path: apkFile.path, versionCode: 2),
      );

      await cubit.restoreDownloadState();

      expect(cubit.state.phase, DownloadPhase.ready);
      verifyNever(() => installer.install(any()));
    });

    test('a still-downloading Service resumes listening for its events', () async {
      when(() => downloader.getDownloadStatus()).thenAnswer(
        (_) async => const DownloadStatus(state: 'downloading', versionCode: 2),
      );

      await cubit.restoreDownloadState();
      expect(cubit.state.phase, DownloadPhase.downloading);

      events.add(const DownloadCompleted('/data/huyenhoc-2.apk'));
      await Future<void>.delayed(Duration.zero);

      expect(cubit.state.phase, DownloadPhase.ready);
    });

    test('idle leaves the state untouched', () async {
      await cubit.restoreDownloadState();
      expect(cubit.state.phase, DownloadPhase.idle);
    });
  });

  group('check()', () {
    test('a newer release nudges (feature-37 §6.2)', () async {
      when(() => repository.fetch()).thenAnswer((_) async => infoWith());

      await cubit.check();

      expect(cubit.state.decision, isA<NudgeUpdate>());
    });

    test('T37-15: a failed check keeps the previous decision, not a crash', () async {
      when(() => repository.fetch()).thenAnswer((_) async => infoWith());
      await cubit.check();
      expect(cubit.state.decision, isA<NudgeUpdate>());

      when(() => repository.fetch()).thenThrow(Exception('network down'));
      await cubit.check();

      // No forced/blocking tier left to preserve (feature-37 §3.4) — a failed
      // check simply leaves the last successful decision in place.
      expect(cubit.state.decision, isA<NudgeUpdate>());
    });
  });
}
