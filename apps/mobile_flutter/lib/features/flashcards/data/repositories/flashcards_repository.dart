import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/storage/secure_storage.dart';
import '../models/flashcard_models.dart';

class FlashcardsRepository {
  final ApiClient _apiClient;
  final SecureStorage _storage;

  FlashcardsRepository({
    ApiClient? apiClient,
    SecureStorage? storage,
  })  : _storage = storage ?? SecureStorage(),
        _apiClient = apiClient ?? ApiClient(storage ?? SecureStorage());

  /// Get random flashcards from a chapter
  /// [count] Number of flashcards to retrieve (1-50, default: 20)
  Future<List<Flashcard>> getRandomFlashcards({
    required int bookId,
    required int chapterId,
    int count = 20,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiEndpoints.chapterFlashcardsRandom(bookId, chapterId),
        queryParameters: {'count': count},
      );

      if (response.data is List) {
        return (response.data as List)
            .map((json) => Flashcard.fromJson(json as Map<String, dynamic>))
            .toList();
      }

      return [];
    } catch (e) {
      debugPrint('Error fetching flashcards: $e');
      throw Exception('Không thể tải flashcards. Vui lòng thử lại.');
    }
  }

  /// Get flashcard progress for a chapter from local storage
  Future<Map<int, FlashcardProgress>> getFlashcardProgress(int chapterId) async {
    try {
      final key = 'flashcard_progress_$chapterId';
      final jsonString = await _storage.read(key);

      if (jsonString == null || jsonString.isEmpty) {
        return {};
      }

      final Map<String, dynamic> jsonMap = json.decode(jsonString);
      final Map<int, FlashcardProgress> progressMap = {};

      jsonMap.forEach((flashcardIdStr, progressJson) {
        final flashcardId = int.parse(flashcardIdStr);
        progressMap[flashcardId] = FlashcardProgress.fromJson(progressJson);
      });

      return progressMap;
    } catch (e) {
      debugPrint('Error loading flashcard progress: $e');
      return {};
    }
  }

  /// Save flashcard progress for a chapter to local storage
  Future<void> saveFlashcardProgress(
    int chapterId,
    Map<int, FlashcardProgress> progressMap,
  ) async {
    try {
      final key = 'flashcard_progress_$chapterId';
      final Map<String, dynamic> jsonMap = {};

      progressMap.forEach((flashcardId, progress) {
        jsonMap[flashcardId.toString()] = progress.toJson();
      });

      final jsonString = json.encode(jsonMap);
      await _storage.write(key, jsonString);
    } catch (e) {
      debugPrint('Error saving flashcard progress: $e');
      throw Exception('Không thể lưu tiến trình. Vui lòng thử lại.');
    }
  }

  /// Update progress for a single flashcard
  Future<void> updateProgress({
    required int chapterId,
    required int flashcardId,
    required bool correct,
  }) async {
    try {
      // Load existing progress
      final progressMap = await getFlashcardProgress(chapterId);

      // Get or create progress for this flashcard
      final currentProgress = progressMap[flashcardId] ?? FlashcardProgress.initial(flashcardId);

      // Update progress based on answer
      final updatedProgress = correct
          ? currentProgress.answerCorrect()
          : currentProgress.answerIncorrect();

      // Save updated progress
      progressMap[flashcardId] = updatedProgress;
      await saveFlashcardProgress(chapterId, progressMap);
    } catch (e) {
      debugPrint('Error updating flashcard progress: $e');
      throw Exception('Không thể cập nhật tiến trình. Vui lòng thử lại.');
    }
  }

  /// Clear all progress for a chapter
  Future<void> clearProgress(int chapterId) async {
    try {
      final key = 'flashcard_progress_$chapterId';
      await _storage.delete(key);
    } catch (e) {
      debugPrint('Error clearing flashcard progress: $e');
      throw Exception('Không thể xóa tiến trình. Vui lòng thử lại.');
    }
  }
}
