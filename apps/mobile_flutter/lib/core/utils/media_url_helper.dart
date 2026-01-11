import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/environment.dart';

class MediaUrlHelper {
  static const _storage = FlutterSecureStorage();
  static const String _tokenKey = 'flutter.auth_token';

  /// Add JWT token to media URL as query parameter for authenticated access
  static Future<String> getAuthenticatedMediaUrl(String mediaUrl) async {
    if (mediaUrl.isEmpty) return '';

    String finalUrl = _buildFullUrl(mediaUrl);

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

    String finalUrl = _buildFullUrl(mediaUrl);

    if (token == null || token.isEmpty) {
      return finalUrl;
    }

    final separator = finalUrl.contains('?') ? '&' : '?';
    return '$finalUrl${separator}token=$token';
  }

  /// Helper to build full URL from path, handling base URL and prefixes
  static String _buildFullUrl(String path) {
    if (path.isEmpty) return '';
    if (path.startsWith('http')) return path;

    final baseUrlStr = Environment.apiBaseUrl;
    final baseUri = Uri.parse(baseUrlStr);
    
    // Normalize path: remove leading slash
    String cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Check if path already contains the prefix (e.g., 'api/media/...')
    // Environment.apiBaseUrl usually ends with '/api/'
    final apiPrefix = baseUri.pathSegments.isNotEmpty 
        ? baseUri.pathSegments.where((s) => s.isNotEmpty).last 
        : '';
    
    if (apiPrefix.isNotEmpty && cleanPath.startsWith('$apiPrefix/')) {
      // If baseUri path already ends with the prefix, and cleanPath starts with it,
      // it means they overlap. We should remove the prefix from cleanPath.
      cleanPath = cleanPath.substring(apiPrefix.length + 1);
    }

    // Build the final URI using the baseUri
    // Uri.resolve handlesjoining correctly
    return baseUri.resolve(cleanPath).toString();
  }
}
