import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class MediaUrlHelper {
  static const _storage = FlutterSecureStorage();
  static const String _tokenKey = 'flutter.auth_token';

  /// Add JWT token to media URL as query parameter for authenticated access
  static Future<String> getAuthenticatedMediaUrl(String mediaUrl) async {
    if (mediaUrl.isEmpty) return '';

    try {
      final token = await _storage.read(key: _tokenKey);
      
      if (token == null || token.isEmpty) {
        return mediaUrl;
      }

      // If URL already has query params, append with &, otherwise use ?
      final separator = mediaUrl.contains('?') ? '&' : '?';
      return '$mediaUrl${separator}token=$token';
    } catch (e) {
      return mediaUrl;
    }
  }

  /// Get authenticated media URL synchronously (requires token to be passed)
  static String getAuthenticatedMediaUrlSync(String mediaUrl, String? token) {
    if (mediaUrl.isEmpty || token == null || token.isEmpty) {
      return mediaUrl;
    }

    final separator = mediaUrl.contains('?') ? '&' : '?';
    return '$mediaUrl${separator}token=$token';
  }
}
