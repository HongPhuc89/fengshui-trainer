import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/quiz_models.dart';
import '../../data/repositories/quiz_repository.dart';

/// Quiz state class
class QuizState {
  final QuizConfig? config;
  final QuizAttempt? attempt;
  final int currentQuestionIndex;
  final Map<int, dynamic> answers; // questionId -> answer
  final int? timeRemaining; // seconds remaining
  final bool isLoading;
  final String? error;
  final SubmitQuizResponse? result;

  const QuizState({
    this.config,
    this.attempt,
    this.currentQuestionIndex = 0,
    this.answers = const {},
    this.timeRemaining,
    this.isLoading = false,
    this.error,
    this.result,
  });

  QuizState copyWith({
    QuizConfig? config,
    QuizAttempt? attempt,
    int? currentQuestionIndex,
    Map<int, dynamic>? answers,
    int? timeRemaining,
    bool? isLoading,
    String? error,
    SubmitQuizResponse? result,
  }) {
    return QuizState(
      config: config ?? this.config,
      attempt: attempt ?? this.attempt,
      currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
      answers: answers ?? this.answers,
      timeRemaining: timeRemaining ?? this.timeRemaining,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      result: result ?? this.result,
    );
  }

  QuizQuestion? get currentQuestion {
    if (attempt != null &&
        currentQuestionIndex >= 0 &&
        currentQuestionIndex < attempt!.questions.length) {
      return attempt!.questions[currentQuestionIndex];
    }
    return null;
  }

  bool get hasNext => attempt != null && currentQuestionIndex < attempt!.questions.length - 1;
  bool get hasPrevious => currentQuestionIndex > 0;
  bool get isLastQuestion => attempt != null && currentQuestionIndex == attempt!.questions.length - 1;

  int get totalQuestions => attempt?.questions.length ?? 0;
  int get answeredCount => answers.length;
  bool get isTimeUp => timeRemaining != null && timeRemaining! <= 0;
}

/// Quiz notifier for state management
class QuizNotifier extends StateNotifier<QuizState> {
  final QuizRepository _repository;
  Timer? _timer;
  int? _bookId;
  int? _chapterId;

  QuizNotifier(this._repository) : super(const QuizState());

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  /// Load quiz configuration
  Future<void> loadQuizConfig({
    required int bookId,
    required int chapterId,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    _bookId = bookId;
    _chapterId = chapterId;

    try {
      final config = await _repository.getQuizConfig(
        bookId: bookId,
        chapterId: chapterId,
      );

      state = state.copyWith(
        config: config,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      debugPrint('Error loading quiz config: $e');
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Start a new quiz attempt
  Future<void> startQuiz({
    required int bookId,
    required int chapterId,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    _bookId = bookId;
    _chapterId = chapterId;

    try {
      final attempt = await _repository.startQuiz(
        bookId: bookId,
        chapterId: chapterId,
      );

      // Initialize time remaining from config
      final timeLimit = state.config?.timeLimit;

      state = state.copyWith(
        attempt: attempt,
        currentQuestionIndex: 0,
        answers: {},
        timeRemaining: timeLimit,
        isLoading: false,
        error: null,
        result: null,
      );

      // Start timer if time limit exists
      if (timeLimit != null && timeLimit > 0) {
        _startTimer();
      }
    } catch (e) {
      debugPrint('Error starting quiz: $e');
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Start countdown timer
  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.timeRemaining != null && state.timeRemaining! > 0) {
        state = state.copyWith(timeRemaining: state.timeRemaining! - 1);
      } else {
        // Time's up - auto submit
        timer.cancel();
        if (state.attempt != null && _bookId != null && _chapterId != null) {
          submitQuiz();
        }
      }
    });
  }

  /// Pause timer
  void pauseTimer() {
    _timer?.cancel();
  }

  /// Resume timer
  void resumeTimer() {
    if (state.timeRemaining != null && state.timeRemaining! > 0) {
      _startTimer();
    }
  }

  /// Answer a question
  void answerQuestion(int questionId, dynamic answer) {
    final updatedAnswers = Map<int, dynamic>.from(state.answers);
    updatedAnswers[questionId] = answer;
    state = state.copyWith(answers: updatedAnswers);
  }

  /// Move to next question
  void nextQuestion() {
    if (state.hasNext) {
      state = state.copyWith(currentQuestionIndex: state.currentQuestionIndex + 1);
    }
  }

  /// Move to previous question
  void previousQuestion() {
    if (state.hasPrevious) {
      state = state.copyWith(currentQuestionIndex: state.currentQuestionIndex - 1);
    }
  }

  /// Submit quiz
  Future<void> submitQuiz() async {
    if (state.attempt == null || _bookId == null || _chapterId == null) {
      return;
    }

    // Stop timer
    _timer?.cancel();

    state = state.copyWith(isLoading: true, error: null);

    try {
      final request = SubmitQuizRequest(
        attemptId: state.attempt!.id,
        answers: state.answers,
      );

      final result = await _repository.submitQuiz(
        bookId: _bookId!,
        chapterId: _chapterId!,
        request: request,
      );

      state = state.copyWith(
        result: result,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      debugPrint('Error submitting quiz: $e');
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Reset quiz state
  void reset() {
    _timer?.cancel();
    state = const QuizState();
  }

  /// Format time remaining as MM:SS
  String formatTimeRemaining() {
    if (state.timeRemaining == null) return '';
    final minutes = state.timeRemaining! ~/ 60;
    final seconds = state.timeRemaining! % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
}

/// Provider for quiz repository
final quizRepositoryProvider = Provider<QuizRepository>((ref) {
  return QuizRepository();
});

/// Provider for quiz state
final quizProvider = StateNotifierProvider<QuizNotifier, QuizState>((ref) {
  final repository = ref.watch(quizRepositoryProvider);
  return QuizNotifier(repository);
});
