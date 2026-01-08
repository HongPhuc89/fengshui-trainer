import 'package:flutter/foundation.dart' show kIsWeb, kDebugMode;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecureStorage {
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  static SharedPreferences? _prefsInstance;

  // Keys - using flutter.* prefix for Flutter app
  static const String _tokenKey = 'flutter.auth_token';
  static const String _refreshTokenKey = 'flutter.refresh_token';
  static const String _userIdKey = 'flutter.user_id';

  // Initialize SharedPreferences for web (singleton pattern)
  Future<SharedPreferences> _getPrefs() async {
    if (kIsWeb) {
      _prefsInstance ??= await SharedPreferences.getInstance();
      return _prefsInstance!;
    }
    throw Exception('SharedPreferences should only be used on web');
  }

  // Token methods
  Future<String?> getToken() async {
    if (kIsWeb) {
      final prefs = await _getPrefs();
      final token = prefs.getString(_tokenKey);
      print('Get token by key: $_tokenKey');
      if (kDebugMode) {
        print('🔍 Getting token from storage: ${token != null ? "Found (${token.substring(0, 20)}...)" : "Not found"}');
      }
      return token;
    }
    return _secureStorage.read(key: _tokenKey);
  }

  Future<void> saveToken(String token) async {
    if (kIsWeb) {
      final prefs = await _getPrefs();
      await prefs.setString(_tokenKey, token);
      if (kDebugMode) {
        print('💾 Token saved to storage: ${token.substring(0, 20)}...');
      }
    } else {
      await _secureStorage.write(key: _tokenKey, value: token);
    }
  }

  Future<String?> getRefreshToken() async {
    if (kIsWeb) {
      final prefs = await _getPrefs();
      return prefs.getString(_refreshTokenKey);
    }
    return _secureStorage.read(key: _refreshTokenKey);
  }

  Future<void> saveRefreshToken(String token) async {
    if (kIsWeb) {
      final prefs = await _getPrefs();
      await prefs.setString(_refreshTokenKey, token);
    } else {
      await _secureStorage.write(key: _refreshTokenKey, value: token);
    }
  }

  // User ID
  Future<String?> getUserId() async {
    if (kIsWeb) {
      final prefs = await _getPrefs();
      return prefs.getString(_userIdKey);
    }
    return _secureStorage.read(key: _userIdKey);
  }

  Future<void> saveUserId(String userId) async {
    if (kIsWeb) {
      final prefs = await _getPrefs();
      await prefs.setString(_userIdKey, userId);
    } else {
      await _secureStorage.write(key: _userIdKey, value: userId);
    }
  }

  // Clear all
  Future<void> clearAll() async {
    if (kIsWeb) {
      final prefs = await _getPrefs();
      await prefs.remove(_tokenKey);
      await prefs.remove(_refreshTokenKey);
      await prefs.remove(_userIdKey);
      if (kDebugMode) {
        print('🗑️ All tokens cleared from storage');
      }
    } else {
      await _secureStorage.deleteAll();
    }
  }

  // Generic methods
  Future<String?> read(String key) async {
    if (kIsWeb) {
      final prefs = await _getPrefs();
      return prefs.getString(key);
    }
    return _secureStorage.read(key: key);
  }

  Future<void> write(String key, String value) async {
    if (kIsWeb) {
      final prefs = await _getPrefs();
      await prefs.setString(key, value);
    } else {
      await _secureStorage.write(key: key, value: value);
    }
  }

  Future<void> delete(String key) async {
    if (kIsWeb) {
      final prefs = await _getPrefs();
      await prefs.remove(key);
    } else {
      await _secureStorage.delete(key: key);
    }
  }
}
