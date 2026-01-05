import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecureStorage {
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  SharedPreferences? _prefs;

  // Keys
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';

  // Initialize SharedPreferences for web
  Future<void> _initPrefs() async {
    if (kIsWeb && _prefs == null) {
      _prefs = await SharedPreferences.getInstance();
    }
  }

  // Token methods
  Future<String?> getToken() async {
    if (kIsWeb) {
      await _initPrefs();
      return _prefs?.getString(_tokenKey);
    }
    return await _secureStorage.read(key: _tokenKey);
  }

  Future<void> saveToken(String token) async {
    if (kIsWeb) {
      await _initPrefs();
      await _prefs?.setString(_tokenKey, token);
    } else {
      await _secureStorage.write(key: _tokenKey, value: token);
    }
  }

  Future<String?> getRefreshToken() async {
    if (kIsWeb) {
      await _initPrefs();
      return _prefs?.getString(_refreshTokenKey);
    }
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  Future<void> saveRefreshToken(String token) async {
    if (kIsWeb) {
      await _initPrefs();
      await _prefs?.setString(_refreshTokenKey, token);
    } else {
      await _secureStorage.write(key: _refreshTokenKey, value: token);
    }
  }

  // User ID
  Future<String?> getUserId() async {
    if (kIsWeb) {
      await _initPrefs();
      return _prefs?.getString(_userIdKey);
    }
    return await _secureStorage.read(key: _userIdKey);
  }

  Future<void> saveUserId(String userId) async {
    if (kIsWeb) {
      await _initPrefs();
      await _prefs?.setString(_userIdKey, userId);
    } else {
      await _secureStorage.write(key: _userIdKey, value: userId);
    }
  }

  // Clear all
  Future<void> clearAll() async {
    if (kIsWeb) {
      await _initPrefs();
      await _prefs?.remove(_tokenKey);
      await _prefs?.remove(_refreshTokenKey);
      await _prefs?.remove(_userIdKey);
    } else {
      await _secureStorage.deleteAll();
    }
  }

  // Generic methods
  Future<String?> read(String key) async {
    if (kIsWeb) {
      await _initPrefs();
      return _prefs?.getString(key);
    }
    return await _secureStorage.read(key: key);
  }

  Future<void> write(String key, String value) async {
    if (kIsWeb) {
      await _initPrefs();
      await _prefs?.setString(key, value);
    } else {
      await _secureStorage.write(key: key, value: value);
    }
  }

  Future<void> delete(String key) async {
    if (kIsWeb) {
      await _initPrefs();
      await _prefs?.remove(key);
    } else {
      await _secureStorage.delete(key: key);
    }
  }
}
