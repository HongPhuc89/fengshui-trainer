// Download and install retries (feature-36 §7.2, §7.3).

import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:huyenhoc/core/update/installer.dart';
import 'package:huyenhoc/features/update/data/update_repository.dart';
import 'package:huyenhoc/features/update/data/update_store.dart';
import 'package:huyenhoc/features/update/domain/update_models.dart';
import 'package:huyenhoc/features/update/presentation/update_cubit.dart';
import 'package:mocktail/mocktail.dart';
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

class MockRepository extends Mock implements UpdateRepository {}

class MockInstaller extends Mock implements AndroidInstaller {}

/// Points getTemporaryDirectory() at a real temp dir for the test.
class FakePathProvider extends PathProviderPlatform with MockPlatformInterfaceMixin {
  FakePathProvider(this.path);
  final String path;

  @override
  Future<String?> getTemporaryPath() async => path;
}

AppVersionInfo infoWith(String digest) => AppVersionInfo(
      versionCode: 2,
      versionName: '1.0.1',
      downloadUrl: 'http://server.test/huyenhoc-2.apk',
      sha256: digest,
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory dir;
  late MockRepository repository;
  late MockInstaller installer;
  late UpdateStore store;
  late UpdateCubit cubit;

  const payload = 'apk-bytes';
  final digest = sha256.convert(payload.codeUnits).toString();

  File apkFile() => File('${dir.path}/huyenhoc-2.apk');

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('update_cubit_test');
    PathProviderPlatform.instance = FakePathProvider(dir.path);
    Hive.init(dir.path);

    repository = MockRepository();
    installer = MockInstaller();
    store = UpdateStore();
    await store.init();

    when(() => installer.install(any())).thenAnswer((_) async {});
    when(() => repository.currentVersionCode()).thenAnswer((_) async => 1);
    when(() => repository.download(any(), any(),
        onProgress: any(named: 'onProgress'))).thenAnswer((invocation) async {
      await File(invocation.positionalArguments[1] as String).writeAsString(payload);
    });

    cubit = UpdateCubit(repository, store, installer);
  });

  tearDown(() async {
    await cubit.close();
    await Hive.deleteFromDisk();
    await dir.delete(recursive: true);
  });

  test('no install permission means nothing is downloaded at all', () async {
    when(() => installer.canInstall()).thenAnswer((_) async => false);

    await cubit.startUpdate(infoWith(digest));

    verifyNever(() => repository.download(any(), any(),
        onProgress: any(named: 'onProgress')));
    expect(cubit.state.needsInstallPermission, isTrue);
    expect(cubit.state.phase, DownloadPhase.idle);
    expect(apkFile().existsSync(), isFalse);
  });

  test('a verified file already on disk is installed without downloading again',
      () async {
    // The exact case from the device: permission granted after the first
    // attempt, then "Cập nhật" tapped again.
    when(() => installer.canInstall()).thenAnswer((_) async => true);
    await apkFile().writeAsString(payload);

    await cubit.startUpdate(infoWith(digest));

    verifyNever(() => repository.download(any(), any(),
        onProgress: any(named: 'onProgress')));
    verify(() => installer.install(apkFile().path)).called(1);
    expect(cubit.state.phase, DownloadPhase.ready);
  });

  test('a half-written file is not reused', () async {
    when(() => installer.canInstall()).thenAnswer((_) async => true);
    await apkFile().writeAsString('truncated');

    await cubit.startUpdate(infoWith(digest));

    verify(() => repository.download(any(), any(),
        onProgress: any(named: 'onProgress'))).called(1);
    verify(() => installer.install(apkFile().path)).called(1);
  });

  test('a digest mismatch after downloading deletes the file and fails', () async {
    when(() => installer.canInstall()).thenAnswer((_) async => true);

    await cubit.startUpdate(infoWith('0' * 64));

    expect(cubit.state.phase, DownloadPhase.failed);
    expect(apkFile().existsSync(), isFalse);
    verifyNever(() => installer.install(any()));
  });

  test('an expired download URL is retried once with a fresh one', () async {
    when(() => installer.canInstall()).thenAnswer((_) async => true);
    when(() => repository.refreshDownloadUrl())
        .thenAnswer((_) async => 'http://server.test/fresh.apk');

    var first = true;
    when(() => repository.download(any(), any(),
        onProgress: any(named: 'onProgress'))).thenAnswer((invocation) async {
      if (first) {
        first = false;
        throw Exception('403 expired');
      }
      await File(invocation.positionalArguments[1] as String).writeAsString(payload);
    });

    await cubit.startUpdate(infoWith(digest));

    verify(() => repository.refreshDownloadUrl()).called(1);
    verify(() => installer.install(apkFile().path)).called(1);
  });

  group('checkInstallPermission()', () {
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

  group('check()', () {
    test('a newer release nudges (feature-37 §6.2)', () async {
      when(() => repository.fetch()).thenAnswer((_) async => infoWith(digest));

      await cubit.check();

      expect(cubit.state.decision, isA<NudgeUpdate>());
    });

    test('T37-15: a failed check keeps the previous decision, not a crash', () async {
      when(() => repository.fetch()).thenAnswer((_) async => infoWith(digest));
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
