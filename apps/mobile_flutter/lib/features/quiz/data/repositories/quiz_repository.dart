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
  /// Note: Quiz config is embedded in the quiz session response
  /// This method is kept for compatibility but returns default config
  Future<QuizConfig> getQuizConfig({
    required int bookId,
    required int chapterId,
  }) async {
    // Return default config since API doesn't have separate config endpoint
    final now = DateTime.now();
    return QuizConfig(
      id: 0,
      chapterId: chapterId,
      questionCount: 10,
      easyPercentage: 30,
      mediumPercentage: 50,
      hardPercentage: 20,
      passingScore: 70,
      timeLimit: 600,
      shuffleQuestions: true,
      shuffleOptions: true,
      showCorrectAnswers: true,
      createdAt: now,
      updatedAt: now,
    );
  }

  /// Start a new quiz attempt
  /// This generates random questions based on the quiz configuration
  Future<QuizAttempt> startQuiz({
    required int bookId,
    required int chapterId,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.quizStart(chapterId),
      );

      return QuizAttempt.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      debugPrint('Error starting quiz: $e');
      throw Exception('Không thể bắt đầu quiz. Vui lòng thử lại.');
    }
  }

  /// Submit quiz answers (complete quiz session)
  Future<SubmitQuizResponse> submitQuiz({
    required int bookId,
    required int chapterId,
    required SubmitQuizRequest request,
  }) async {
    try {
      // Use session ID from attempt
      final response = await _apiClient.post(
        ApiEndpoints.quizComplete(request.attemptId.toString()),
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
        ApiEndpoints.quizHistory(chapterId),
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
        ApiEndpoints.quizSession(attemptId.toString()),
      );

      return QuizAttempt.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      debugPrint('Error fetching quiz attempt: $e');
      throw Exception('Không thể tải chi tiết quiz. Vui lòng thử lại.');
    }
  }
}
