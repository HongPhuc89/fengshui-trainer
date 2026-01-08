import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/storage/secure_storage.dart';
import '../models/mindmap_models.dart';

class MindmapRepository {

  MindmapRepository({
    ApiClient? apiClient,
    SecureStorage? storage,
  })  : _storage = storage ?? SecureStorage(),
        _apiClient = apiClient ?? ApiClient(storage ?? SecureStorage());
  final ApiClient _apiClient;
  final SecureStorage _storage;

  /// Get mindmap for a chapter
  Future<MindMap> getMindmap({
    required int bookId,
    required int chapterId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.mindmap(bookId, chapterId),
      );

      return MindMap.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      debugPrint('Error fetching mindmap: $e');
      throw Exception('Không thể tải mindmap. Vui lòng thử lại.');
    }
  }
}
