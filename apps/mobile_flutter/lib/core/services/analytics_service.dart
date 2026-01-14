import 'package:amplitude_flutter/amplitude.dart';
import 'package:amplitude_flutter/configuration.dart';
import 'package:amplitude_flutter/events/identify.dart';
import 'package:amplitude_flutter/events/base_event.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';

import '../config/environment.dart';

/// Centralized analytics service that handles both Amplitude and Firebase Analytics
class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._internal();
  factory AnalyticsService() => _instance;
  AnalyticsService._internal();

  Amplitude? _amplitude;
  final FirebaseAnalytics _firebaseAnalytics = FirebaseAnalytics.instance;
  bool _isInitialized = false;

  /// Initialize the analytics service
  Future<void> initialize() async {
    if (_isInitialized) {
      if (kDebugMode) {
        print('📊 [Analytics] Already initialized');
      }
      return;
    }

    try {
      // Initialize Amplitude
      final apiKey = Environment.amplitudeApiKey;
      if (apiKey.isNotEmpty) {
        _amplitude = Amplitude(Configuration(apiKey: apiKey));
        
        if (kDebugMode) {
          print('📊 [Analytics] Amplitude initialized successfully');
        }
      } else {
        if (kDebugMode) {
          print('⚠️ [Analytics] Amplitude API key not configured');
        }
      }

      _isInitialized = true;
      
      // Log initialization event
      await logEvent('analytics_initialized');
    } catch (e) {
      if (kDebugMode) {
        print('❌ [Analytics] Initialization failed: $e');
      }
    }
  }

  /// Set user ID for analytics
  Future<void> setUserId(String userId) async {
    try {
      // Set user ID in Amplitude
      if (_amplitude != null) {
        await _amplitude!.setUserId(userId);
      }

      // Set user ID in Firebase
      await _firebaseAnalytics.setUserId(id: userId);

      if (kDebugMode) {
        print('📊 [Analytics] User ID set: $userId');
      }
    } catch (e) {
      if (kDebugMode) {
        print('❌ [Analytics] Failed to set user ID: $e');
      }
    }
  }

  /// Set user properties
  Future<void> setUserProperties(Map<String, dynamic> properties) async {
    try {
      // Set properties in Amplitude
      if (_amplitude != null) {
        final identify = Identify();
        properties.forEach((key, value) {
          identify.set(key, value);
        });
        await _amplitude!.identify(identify);
      }

      // Set properties in Firebase (one at a time)
      for (final entry in properties.entries) {
        await _firebaseAnalytics.setUserProperty(
          name: entry.key,
          value: entry.value?.toString(),
        );
      }

      if (kDebugMode) {
        print('📊 [Analytics] User properties set: $properties');
      }
    } catch (e) {
      if (kDebugMode) {
        print('❌ [Analytics] Failed to set user properties: $e');
      }
    }
  }

  /// Log an event with optional properties
  Future<void> logEvent(String eventName, [Map<String, dynamic>? properties]) async {
    try {
      // Convert Map<String, dynamic> to Map<String, Object> for Amplitude & Firebase
      final Map<String, Object>? processedProperties = properties?.map(
        (key, value) => MapEntry(key, value as Object),
      );

      // Log to Amplitude
      if (_amplitude != null) {
        await _amplitude!.track(BaseEvent(eventName, eventProperties: processedProperties));
      }

      // Log to Firebase
      await _firebaseAnalytics.logEvent(
        name: eventName,
        parameters: processedProperties,
      );

      if (kDebugMode) {
        print('📊 [Analytics] Event logged: $eventName ${properties != null ? properties : ''}');
      }
    } catch (e) {
      if (kDebugMode) {
        print('❌ [Analytics] Failed to log event: $e');
      }
    }
  }

  /// Clear user data (on logout)
  Future<void> clearUser() async {
    try {
      // Clear Amplitude user
      if (_amplitude != null) {
        await _amplitude!.setUserId(null);
        // Note: regenerateDeviceId is not directly exposed in the same way in v4
      }

      // Clear Firebase user
      await _firebaseAnalytics.setUserId(id: null);

      if (kDebugMode) {
        print('📊 [Analytics] User data cleared');
      }
    } catch (e) {
      if (kDebugMode) {
        print('❌ [Analytics] Failed to clear user: $e');
      }
    }
  }

  // ========== Authentication Events ==========

  Future<void> logLogin({required String method}) async {
    await logEvent('login', {'method': method});
  }

  Future<void> logLoginFailure({required String reason}) async {
    await logEvent('login_failure', {'reason': reason});
  }

  Future<void> logRegister({required String method}) async {
    await logEvent('register', {'method': method});
  }

  Future<void> logRegisterFailure({required String reason}) async {
    await logEvent('register_failure', {'reason': reason});
  }

  Future<void> logLogout() async {
    await logEvent('logout');
  }

  Future<void> logSessionRestored() async {
    await logEvent('session_restored');
  }

  // ========== Book Events ==========

  Future<void> logBookListViewed() async {
    await logEvent('book_list_viewed');
  }

  Future<void> logBookDetailViewed({required int bookId, required String bookTitle}) async {
    await logEvent('book_detail_viewed', {
      'book_id': bookId,
      'book_title': bookTitle,
    });
  }

  Future<void> logChapterOpened({
    required int bookId,
    required int chapterId,
    required String chapterTitle,
  }) async {
    await logEvent('chapter_opened', {
      'book_id': bookId,
      'chapter_id': chapterId,
      'chapter_title': chapterTitle,
    });
  }

  Future<void> logReadingSessionStarted({
    required int bookId,
    required int chapterId,
  }) async {
    await logEvent('reading_session_started', {
      'book_id': bookId,
      'chapter_id': chapterId,
    });
  }

  Future<void> logReadingProgressUpdated({
    required int bookId,
    required int chapterId,
    required int currentPage,
    required int totalPages,
  }) async {
    await logEvent('reading_progress_updated', {
      'book_id': bookId,
      'chapter_id': chapterId,
      'current_page': currentPage,
      'total_pages': totalPages,
      'progress_percentage': ((currentPage / totalPages) * 100).round(),
    });
  }

  // ========== Quiz Events ==========

  Future<void> logQuizStarted({
    required int bookId,
    required int chapterId,
    required String difficulty,
  }) async {
    await logEvent('quiz_started', {
      'book_id': bookId,
      'chapter_id': chapterId,
      'difficulty': difficulty,
    });
  }

  Future<void> logQuizQuestionAnswered({
    required int questionNumber,
    required bool isCorrect,
    required String difficulty,
  }) async {
    await logEvent('quiz_question_answered', {
      'question_number': questionNumber,
      'is_correct': isCorrect,
      'difficulty': difficulty,
    });
  }

  Future<void> logQuizCompleted({
    required int bookId,
    required int chapterId,
    required int score,
    required int totalQuestions,
    required String difficulty,
    required int timeSpentSeconds,
  }) async {
    await logEvent('quiz_completed', {
      'book_id': bookId,
      'chapter_id': chapterId,
      'score': score,
      'total_questions': totalQuestions,
      'difficulty': difficulty,
      'time_spent_seconds': timeSpentSeconds,
      'percentage': ((score / totalQuestions) * 100).round(),
    });
  }

  Future<void> logQuizResultsViewed({
    required int attemptId,
    required int score,
  }) async {
    await logEvent('quiz_results_viewed', {
      'attempt_id': attemptId,
      'score': score,
    });
  }

  // ========== Flashcard Events ==========

  Future<void> logFlashcardSessionStarted({
    required int bookId,
    required int chapterId,
    required int cardCount,
  }) async {
    await logEvent('flashcard_session_started', {
      'book_id': bookId,
      'chapter_id': chapterId,
      'card_count': cardCount,
    });
  }

  Future<void> logFlashcardFlipped({
    required int cardIndex,
    required bool showingAnswer,
  }) async {
    await logEvent('flashcard_flipped', {
      'card_index': cardIndex,
      'showing_answer': showingAnswer,
    });
  }

  Future<void> logFlashcardSessionCompleted({
    required int bookId,
    required int chapterId,
    required int cardsReviewed,
    required int timeSpentSeconds,
  }) async {
    await logEvent('flashcard_session_completed', {
      'book_id': bookId,
      'chapter_id': chapterId,
      'cards_reviewed': cardsReviewed,
      'time_spent_seconds': timeSpentSeconds,
    });
  }

  // ========== Mindmap Events ==========

  Future<void> logMindmapViewed({
    required int bookId,
    required int chapterId,
  }) async {
    await logEvent('mindmap_viewed', {
      'book_id': bookId,
      'chapter_id': chapterId,
    });
  }
}
