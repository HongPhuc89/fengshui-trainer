// Local memory of the update flow (feature-36 §7.7).

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:huyenhoc/features/update/data/update_store.dart';

void main() {
  late Directory dir;
  late UpdateStore store;

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('update_store_test');
    Hive.init(dir.path);
    store = UpdateStore();
    await store.init();
  });

  tearDown(() async {
    await Hive.deleteFromDisk();
    await dir.delete(recursive: true);
  });

  test('skip is remembered per version, not globally', () async {
    await store.skip(12);

    expect(store.isSkipped(12), isTrue);
    expect(store.isSkipped(13), isFalse);
  });

  test('T36-24: records at or below the running build are pruned', () async {
    await store.skip(10);
    await store.skip(11);
    await store.skip(13);

    // The user has since updated to 12; 10 and 11 can never be offered again.
    await store.skip(14, currentVersionCode: 12);

    expect(store.isSkipped(10), isFalse);
    expect(store.isSkipped(11), isFalse);
    expect(store.isSkipped(13), isTrue);
    expect(store.isSkipped(14), isTrue);
  });

  test('the first check always runs, later ones wait out the interval', () async {
    final now = DateTime(2026, 1, 1, 12);
    expect(store.shouldCheck(now: now), isTrue);

    await store.markChecked(now: now);
    expect(store.shouldCheck(now: now.add(const Duration(hours: 5))), isFalse);
    expect(store.shouldCheck(now: now.add(const Duration(hours: 7))), isTrue);
  });
}
