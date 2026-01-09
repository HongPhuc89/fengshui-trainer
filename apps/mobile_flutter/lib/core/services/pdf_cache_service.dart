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
    return url.hashCode.toString();
  }

  Future<String?> getCachedFilePath(String url) async {
    if (kIsWeb) return null;
    try {
      final cacheKey = _getCacheKey(url);
      final cacheDir = await _getCacheDir();
      final file = File('${cacheDir.path}/$cacheKey.pdf');
      if (await file.exists()) {
        return file.path;
      }
    } catch (e) {
      print('Error getting cached file: $e');
    }
    return null;
  }

  Future<String?> downloadAndCache(String url,
      {Function(double)? onProgress,}) async {
    if (kIsWeb) return null;
    try {
      print('[PdfCache] Starting download from URL: $url');
      
      final cacheKey = _getCacheKey(url);
      final cacheDir = await _getCacheDir();
      final filePath = '${cacheDir.path}/$cacheKey.pdf';

      // Get auth token for protected URLs
      final token = await _storage.getToken();
      final headers = <String, dynamic>{};
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
        print('[PdfCache] Adding auth token to download request');
      } else {
        print('[PdfCache] ⚠️ No auth token found');
      }

      print('[PdfCache] Downloading to: $filePath');
      
      await _dio.download(
        url,
        filePath,
        options: Options(headers: headers),
        onReceiveProgress: (received, total) {
          if (total != -1 && onProgress != null) {
            onProgress(received / total);
          }
        },
      );

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('$_cacheKeyPrefix$cacheKey', url);
      print('[PdfCache] PDF downloaded and cached successfully');
      return filePath;
    } catch (e) {
      print('Error downloading PDF: $e');
      if (e is DioException) {
        print('[PdfCache] Status code: ${e.response?.statusCode}');
        print('[PdfCache] Response data: ${e.response?.data}');
        print('[PdfCache] Request URL: ${e.requestOptions.uri}');
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
