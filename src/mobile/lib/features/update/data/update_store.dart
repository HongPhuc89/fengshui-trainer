// Local memory of the update flow: last check, skipped versions
// (feature-37 §6.3).

import 'dart:convert';

import 'package:hive_flutter/hive_flutter.dart';
import 'package:injectable/injectable.dart';

/// Resume re-checks are throttled: without this every app switch is a request.
const kUpdateCheckInterval = Duration(hours: 6);

@singleton
class UpdateStore {
  static const _boxName = 'app_update';
  static const _lastCheckKey = 'last_check_at';
  static const _skipsKey = 'skipped_versions';

  late Box _box;

  @PostConstruct(preResolve: true)
  Future<void> init() async {
    _box = await Hive.openBox(_boxName);
  }

  bool shouldCheck({DateTime? now}) {
    final raw = _box.get(_lastCheckKey) as int?;
    if (raw == null) return true;
    final last = DateTime.fromMillisecondsSinceEpoch(raw);
    return (now ?? DateTime.now()).difference(last) >= kUpdateCheckInterval;
  }

  Future<void> markChecked({DateTime? now}) =>
      _box.put(_lastCheckKey, (now ?? DateTime.now()).millisecondsSinceEpoch);

  bool isSkipped(int versionCode) => _readSkips().containsKey('$versionCode');

  /// Records the skip and prunes anything at or below the running build, so the
  /// box cannot grow by one entry per release forever.
  Future<void> skip(int versionCode, {int? currentVersionCode, DateTime? now}) async {
    final skips = _readSkips();
    final key = '$versionCode';
    final previous = skips[key] as Map?;
    skips[key] = {
      'count': ((previous?['count'] as int?) ?? 0) + 1,
      'last_at': (now ?? DateTime.now()).toIso8601String(),
    };
    if (currentVersionCode != null) {
      skips.removeWhere((k, _) => (int.tryParse(k) ?? 0) <= currentVersionCode);
    }
    await _box.put(_skipsKey, jsonEncode(skips));
  }

  Map<String, dynamic> _readSkips() {
    final raw = _box.get(_skipsKey) as String?;
    if (raw == null) return {};
    try {
      return Map<String, dynamic>.from(jsonDecode(raw) as Map);
    } catch (_) {
      return {};
    }
  }
}
