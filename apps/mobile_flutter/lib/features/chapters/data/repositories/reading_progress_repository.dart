import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/reading_progress_models.dart';

class ReadingProgressRepository {

  ReadingProgressRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<ReadingProgress?> getProgress(int chapterId) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        ApiEndpoints.chapterProgress(chapterId),
      );
      return ReadingProgress.fromJson(response);
    } catch (e) {
      // No progress yet
      return null;
    }
  }

  Future<ReadingProgress> updateProgress(
    int chapterId,
    UpdateProgressRequest request,
  ) async {
    final response = await _apiClient.put<Map<String, dynamic>>(
      ApiEndpoints.chapterProgress(chapterId),
      data: request.toJson(),
    );
    return ReadingProgress.fromJson(response);
  }

  Future<void> markAsCompleted(int chapterId) async {
    await _apiClient.post(
      '${ApiEndpoints.chapterProgress(chapterId)}/complete',
    );
  }
}
