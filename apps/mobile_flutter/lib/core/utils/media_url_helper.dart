import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/environment.dart';

class MediaUrlHelper {
  static const _storage = FlutterSecureStorage();
  static const String _tokenKey = 'flutter.auth_token';

  /// Add JWT token to media URL as query parameter for authenticated access
  static Future<String> getAuthenticatedMediaUrl(String mediaUrl) async {
    if (mediaUrl.isEmpty) return '';

    String finalUrl = mediaUrl;
    // If it's a relative path, prepend base URL
    if (!finalUrl.startsWith('http')) {
      final baseUrl = Environment.apiBaseUrl;
      final cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
      final cleanPath = finalUrl.startsWith('/') ? finalUrl : '/$finalUrl';
      finalUrl = '$cleanBaseUrl$cleanPath';
    }

    try {
      final token = await _storage.read(key: _tokenKey);
      
      if (token == null || token.isEmpty) {
        return finalUrl;
      }

      // If URL already has query params, append with &, otherwise use ?
      final separator = finalUrl.contains('?') ? '&' : '?';
      return '$finalUrl${separator}token=$token';
    } catch (e) {
      return finalUrl;
    }
  }

  /// Get authenticated media URL synchronously (requires token to be passed)
  static String getAuthenticatedMediaUrlSync(String mediaUrl, String? token) {
    if (mediaUrl.isEmpty) return '';

    String finalUrl = mediaUrl;
    if (!finalUrl.startsWith('http')) {
      final baseUrl = Environment.apiBaseUrl;
      final cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
      final cleanPath = finalUrl.startsWith('/') ? finalUrl : '/$finalUrl';
      finalUrl = '$cleanBaseUrl$cleanPath';
    }

    if (token == null || token.isEmpty) {
      return finalUrl;
    }

    final separator = finalUrl.contains('?') ? '&' : '?';
    return '$finalUrl${separator}token=$token';
  }
}
