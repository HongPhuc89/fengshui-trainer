import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/storage/secure_storage.dart';
import '../models/mindmap_model.dart';

class MindmapRepository {
  MindmapRepository({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient(SecureStorage());

  final ApiClient _apiClient;

  /// Get mindmap for a chapter
  Future<Mindmap> getMindmapByChapter({
    required int bookId,
    required int chapterId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.mindmap(bookId, chapterId),
      );

      return Mindmap.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      debugPrint('Error fetching mindmap: $e');
      throw Exception('Không thể tải mindmap. Vui lòng thử lại.');
    }
  }
}
