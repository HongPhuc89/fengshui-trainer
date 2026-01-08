import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PdfCacheService {
  final Dio _dio = Dio();
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
      final cacheKey = _getCacheKey(url);
      final cacheDir = await _getCacheDir();
      final filePath = '${cacheDir.path}/$cacheKey.pdf';

      await _dio.download(
        url,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1 && onProgress != null) {
            onProgress(received / total);
          }
        },
      );

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('$_cacheKeyPrefix$cacheKey', url);
      return filePath;
    } catch (e) {
      print('Error downloading PDF: $e');
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
