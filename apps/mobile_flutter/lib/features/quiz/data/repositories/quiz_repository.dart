import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/storage/secure_storage.dart';
import '../models/quiz_models.dart';

class QuizRepository {

  QuizRepository({
    ApiClient? apiClient,
    SecureStorage? storage,
  })  : _storage = storage ?? SecureStorage(),
        _apiClient = apiClient ?? ApiClient(storage ?? SecureStorage());
  final ApiClient _apiClient;
  final SecureStorage _storage;

  /// Get quiz configuration for a chapter
  Future<QuizConfig> getQuizConfig({
    required int bookId,
    required int chapterId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.quizConfig(bookId, chapterId),
      );

      return QuizConfig.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      debugPrint('Error fetching quiz config: $e');
      throw Exception('Không thể tải cấu hình quiz. Vui lòng thử lại.');
    }
  }

  /// Start a new quiz attempt
  /// This generates random questions based on the quiz configuration
  Future<QuizAttempt> startQuiz({
    required int bookId,
    required int chapterId,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.quizStart(bookId, chapterId),
      );

      return QuizAttempt.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      debugPrint('Error starting quiz: $e');
      throw Exception('Không thể bắt đầu quiz. Vui lòng thử lại.');
    }
  }

  /// Submit quiz answers
  Future<SubmitQuizResponse> submitQuiz({
    required int bookId,
    required int chapterId,
    required SubmitQuizRequest request,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.quizSubmit(bookId, chapterId),
        data: request.toJson(),
      );

      return SubmitQuizResponse.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      debugPrint('Error submitting quiz: $e');
      throw Exception('Không thể nộp bài quiz. Vui lòng thử lại.');
    }
  }

  /// Get user's quiz attempt history for a chapter
  Future<List<QuizAttempt>> getAttemptHistory({
    required int bookId,
    required int chapterId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.quizAttempts(bookId, chapterId),
      );

      if (response is List) {
        return response
            .map((json) => QuizAttempt.fromJson(json as Map<String, dynamic>))
            .toList();
      }

      return [];
    } catch (e) {
      debugPrint('Error fetching quiz history: $e');
      throw Exception('Không thể tải lịch sử quiz. Vui lòng thử lại.');
    }
  }

  /// Get details of a specific quiz attempt
  Future<QuizAttempt> getAttemptById({
    required int bookId,
    required int chapterId,
    required int attemptId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.quizAttemptDetail(bookId, chapterId, attemptId),
      );

      return QuizAttempt.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      debugPrint('Error fetching quiz attempt: $e');
      throw Exception('Không thể tải chi tiết quiz. Vui lòng thử lại.');
    }
  }
}
