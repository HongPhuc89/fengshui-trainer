import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:injectable/injectable.dart';

@singleton
class CacheService {
  static const _boxName = 'api_cache';
  static const _tsBoxName = 'api_cache_ts';

  late Box _box;
  late Box<int> _tsBox;

  // preResolve tells injectable this singleton is fully built before the app
  // runs, so everything downstream (AuthCubit -> ApiClient -> repositories ->
  // blocs) can stay a synchronous registration. Without it the async spreads all
  // the way to AuthBloc and getIt<AuthBloc>() throws "You can't use get with an
  // async Factory".
  @PostConstruct(preResolve: true)
  Future<void> init() async {
    _box = await Hive.openBox(_boxName);
    _tsBox = await Hive.openBox<int>(_tsBoxName);
  }

  Future<T?> get<T>(String key) async {
    final ts = _tsBox.get(key);
    if (ts == null) return null;

    final expiry = DateTime.fromMillisecondsSinceEpoch(ts);
    if (DateTime.now().isAfter(expiry)) {
      await _box.delete(key);
      await _tsBox.delete(key);
      return null;
    }

    final raw = _box.get(key);
    if (raw == null) return null;

    try {
      if (T == String) return raw as T;
      return jsonDecode(raw as String) as T;
    } catch (_) {
      return null;
    }
  }

  Future<void> set(String key, dynamic value, Duration ttl) async {
    final expiry = DateTime.now().add(ttl).millisecondsSinceEpoch;
    final encoded = value is String ? value : jsonEncode(value);
    await _box.put(key, encoded);
    await _tsBox.put(key, expiry);
  }

  Future<void> delete(String key) async {
    await _box.delete(key);
    await _tsBox.delete(key);
  }

  Future<void> clearAll() async {
    await _box.clear();
    await _tsBox.clear();
  }
}
