import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../storage/secure_storage.dart';

class PdfCacheService {
  PdfCacheService(this._storage) {
    _dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 60),
      ),
    );
  }

  late final Dio _dio;
  final SecureStorage _storage;
  static const String _cacheKeyPrefix = 'pdf_cache_';

  Future<Directory> _getCacheDir() async {
    if (kIsWeb) {
      throw UnsupportedError('File caching not supported on web');
    }
    final dir = await getApplicationDocumentsDirectory();
    final cacheDir = Directory('${dir.path}/pdf_cache');
    if (!await cacheDir.exists()) {
      await cacheDir.create(recursive: true);
    }
    return cacheDir;
  }

  String _getCacheKey(String url) {
    // Extract base URL without query parameters (e.g., signed tokens)
    // This ensures the same file is cached even if the signed URL token changes
    try {
      final uri = Uri.parse(url);
      final baseUrl = '${uri.scheme}://${uri.host}${uri.path}';
      // Use the path for hash to be more stable across different auth tokens
      return baseUrl.hashCode.toString();
    } catch (e) {
      return url.hashCode.toString();
    }
  }

  Future<String?> getCachedFilePath(String url) async {
    if (kIsWeb) return null;
    try {
      final cacheKey = _getCacheKey(url);
      final cacheDir = await _getCacheDir();
      final file = File('${cacheDir.path}/$cacheKey.pdf');
      
      if (await file.exists()) {
        final size = await file.length();
        print('[PdfCache] ✅ Found cached file: $cacheKey.pdf (${(size / 1024 / 1024).toStringAsFixed(2)} MB)');
        return file.path;
      } else {
        print('[PdfCache] 🔍 No cache for key: $cacheKey');
      }
    } catch (e) {
      print('[PdfCache] Error checking cache: $e');
    }
    return null;
  }

  Future<String?> downloadAndCache(String url,
      {Function(double)? onProgress,}) async {
    if (kIsWeb) {
      print('[PdfCache] 🌐 Web platform detected, skipping download/cache');
      return null;
    }
    
    try {
      print('[PdfCache] ⏳ Starting download: $url');
      
      final cacheKey = _getCacheKey(url);
      final cacheDir = await _getCacheDir();
      final filePath = '${cacheDir.path}/$cacheKey.pdf';

      // Check if URL is absolute
      if (!url.startsWith('http')) {
        print('[PdfCache] ❌ Error: URL must be absolute. Received: $url');
        return null;
      }

      final headers = <String, dynamic>{};
      // Only add header if token is not already in the URL
      if (!url.contains('token=')) {
        final token = await _storage.getToken();
        if (token != null) {
          headers['Authorization'] = 'Bearer $token';
          print('[PdfCache] 🔑 Adding Bearer token to headers');
        } else {
          print('[PdfCache] ⚠️ No token in URL and no token found in storage');
        }
      } else {
        print('[PdfCache] ✅ URL already contains token');
      }

      print('[PdfCache] 📂 Target path: $filePath');
      
      final response = await _dio.download(
        url,
        filePath,
        options: Options(headers: headers),
        onReceiveProgress: (received, total) {
          if (total != -1 && onProgress != null) {
            onProgress(received / total);
          }
        },
      );

      if (response.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('$_cacheKeyPrefix$cacheKey', url);
        print('[PdfCache] ✨ Download complete and cached: $cacheKey.pdf');
        return filePath;
      } else {
        print('[PdfCache] ❌ Download failed with status: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('[PdfCache] ❌ Error downloading PDF: $e');
      if (e is DioException) {
        print('[PdfCache] Status code: ${e.response?.statusCode}');
        print('[PdfCache] Response data: ${e.response?.data}');
        print('[PdfCache] Request details: ${e.requestOptions.method} ${e.requestOptions.uri}');
      }
      return null;
    }
  }

  Future<void> clearCache() async {
    if (kIsWeb) return;
    try {
      final cacheDir = await _getCacheDir();
      if (await cacheDir.exists()) {
        await cacheDir.delete(recursive: true);
      }
    } catch (e) {
      print('Error clearing cache: $e');
    }
  }
}
