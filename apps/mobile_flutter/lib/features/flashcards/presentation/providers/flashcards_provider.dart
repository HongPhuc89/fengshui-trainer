import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/flashcard_models.dart';
import '../../data/repositories/flashcards_repository.dart';

/// Flashcards state class
class FlashcardsState {
  final List<Flashcard> flashcards;
  final Map<int, FlashcardProgress> progressMap;
  final int currentIndex;
  final bool isFlipped;
  final bool isLoading;
  final String? error;

  const FlashcardsState({
    this.flashcards = const [],
    this.progressMap = const {},
    this.currentIndex = 0,
    this.isFlipped = false,
    this.isLoading = false,
    this.error,
  });

  FlashcardsState copyWith({
    List<Flashcard>? flashcards,
    Map<int, FlashcardProgress>? progressMap,
    int? currentIndex,
    bool? isFlipped,
    bool? isLoading,
    String? error,
  }) {
    return FlashcardsState(
      flashcards: flashcards ?? this.flashcards,
      progressMap: progressMap ?? this.progressMap,
      currentIndex: currentIndex ?? this.currentIndex,
      isFlipped: isFlipped ?? this.isFlipped,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  Flashcard? get currentFlashcard {
    if (currentIndex >= 0 && currentIndex < flashcards.length) {
      return flashcards[currentIndex];
    }
    return null;
  }

  FlashcardProgress? get currentProgress {
    final flashcard = currentFlashcard;
    if (flashcard != null) {
      return progressMap[flashcard.id];
    }
    return null;
  }

  bool get hasNext => currentIndex < flashcards.length - 1;
  bool get hasPrevious => currentIndex > 0;
  bool get isCompleted => currentIndex >= flashcards.length;

  int get totalCards => flashcards.length;
  int get reviewedCount => progressMap.values.where((p) => p.reviewCount > 0).length;
  int get correctCount => progressMap.values.where((p) => p.correctCount > 0).length;
}

/// Flashcards notifier for state management
class FlashcardsNotifier extends StateNotifier<FlashcardsState> {
  final FlashcardsRepository _repository;
  int? _currentChapterId;

  FlashcardsNotifier(this._repository) : super(const FlashcardsState());

  /// Load flashcards for a chapter
  Future<void> loadFlashcards({
    required int bookId,
    required int chapterId,
    int count = 20,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    _currentChapterId = chapterId;

    try {
      // Fetch flashcards from API
      final flashcards = await _repository.getRandomFlashcards(
        bookId: bookId,
        chapterId: chapterId,
        count: count,
      );

      if (flashcards.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          error: 'Chương này chưa có flashcards',
        );
        return;
      }

      // Load existing progress from local storage
      final progressMap = await _repository.getFlashcardProgress(chapterId);

      // Initialize progress for new flashcards
      final updatedProgressMap = Map<int, FlashcardProgress>.from(progressMap);
      for (final flashcard in flashcards) {
        if (!updatedProgressMap.containsKey(flashcard.id)) {
          updatedProgressMap[flashcard.id] = FlashcardProgress.initial(flashcard.id);
        }
      }

      // Sort flashcards by priority (lower mastery = higher priority)
      final sortedFlashcards = _sortByPriority(flashcards, updatedProgressMap);

      state = state.copyWith(
        flashcards: sortedFlashcards,
        progressMap: updatedProgressMap,
        currentIndex: 0,
        isFlipped: false,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      debugPrint('Error loading flashcards: $e');
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Sort flashcards by priority using spaced repetition algorithm
  /// Lower mastery level = higher priority (appears first)
  List<Flashcard> _sortByPriority(
    List<Flashcard> flashcards,
    Map<int, FlashcardProgress> progressMap,
  ) {
    final sortedList = List<Flashcard>.from(flashcards);
    sortedList.sort((a, b) {
      final progressA = progressMap[a.id] ?? FlashcardProgress.initial(a.id);
      final progressB = progressMap[b.id] ?? FlashcardProgress.initial(b.id);

      // Sort by mastery level (ascending - lower mastery first)
      final masteryCompare = progressA.masteryLevel.compareTo(progressB.masteryLevel);
      if (masteryCompare != 0) return masteryCompare;

      // If same mastery, sort by last reviewed (oldest first)
      return progressA.lastReviewed.compareTo(progressB.lastReviewed);
    });
    return sortedList;
  }

  /// Flip the current card
  void flipCard() {
    state = state.copyWith(isFlipped: !state.isFlipped);
  }

  /// Answer correct - increase mastery and move to next card
  Future<void> answerCorrect() async {
    await _updateProgressAndNext(correct: true);
  }

  /// Answer incorrect - decrease mastery and move to next card
  Future<void> answerIncorrect() async {
    await _updateProgressAndNext(correct: false);
  }

  /// Update progress and move to next card
  Future<void> _updateProgressAndNext({required bool correct}) async {
    final flashcard = state.currentFlashcard;
    if (flashcard == null || _currentChapterId == null) return;

    try {
      // Update progress in repository
      await _repository.updateProgress(
        chapterId: _currentChapterId!,
        flashcardId: flashcard.id,
        correct: correct,
      );

      // Update local state
      final currentProgress = state.currentProgress ?? FlashcardProgress.initial(flashcard.id);
      final updatedProgress = correct
          ? currentProgress.answerCorrect()
          : currentProgress.answerIncorrect();

      final updatedProgressMap = Map<int, FlashcardProgress>.from(state.progressMap);
      updatedProgressMap[flashcard.id] = updatedProgress;

      // Move to next card
      state = state.copyWith(
        progressMap: updatedProgressMap,
        currentIndex: state.currentIndex + 1,
        isFlipped: false,
      );
    } catch (e) {
      debugPrint('Error updating progress: $e');
      state = state.copyWith(error: e.toString());
    }
  }

  /// Move to next card without updating progress
  void nextCard() {
    if (state.hasNext) {
      state = state.copyWith(
        currentIndex: state.currentIndex + 1,
        isFlipped: false,
      );
    }
  }

  /// Move to previous card
  void previousCard() {
    if (state.hasPrevious) {
      state = state.copyWith(
        currentIndex: state.currentIndex - 1,
        isFlipped: false,
      );
    }
  }

  /// Reset session - start over with same cards
  void resetSession() {
    state = state.copyWith(
      currentIndex: 0,
      isFlipped: false,
    );
  }

  /// Clear all progress for current chapter
  Future<void> clearProgress() async {
    if (_currentChapterId == null) return;

    try {
      await _repository.clearProgress(_currentChapterId!);

      // Reset progress map
      final resetProgressMap = <int, FlashcardProgress>{};
      for (final flashcard in state.flashcards) {
        resetProgressMap[flashcard.id] = FlashcardProgress.initial(flashcard.id);
      }

      state = state.copyWith(
        progressMap: resetProgressMap,
        currentIndex: 0,
        isFlipped: false,
      );
    } catch (e) {
      debugPrint('Error clearing progress: $e');
      state = state.copyWith(error: e.toString());
    }
  }
}

/// Provider for flashcards repository
final flashcardsRepositoryProvider = Provider<FlashcardsRepository>((ref) {
  return FlashcardsRepository();
});

/// Provider for flashcards state
final flashcardsProvider = StateNotifierProvider<FlashcardsNotifier, FlashcardsState>((ref) {
  final repository = ref.watch(flashcardsRepositoryProvider);
  return FlashcardsNotifier(repository);
});
