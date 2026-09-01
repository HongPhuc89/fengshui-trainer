part of 'quiz_bloc.dart';

abstract class QuizState extends Equatable {
  const QuizState();
  @override
  List<Object?> get props => [];
}

class QuizInitial extends QuizState {}

class QuizLoading extends QuizState {}

class QuizInProgress extends QuizState {
  final String activityId;
  final Exam exam;
  final int currentIndex;
  final Map<String, String> answers; // questionId → choiceId

  const QuizInProgress({
    required this.activityId,
    required this.exam,
    required this.currentIndex,
    required this.answers,
  });

  QuizQuestion get currentQuestion => exam.questions[currentIndex];
  String? get currentAnswer => answers[currentQuestion.id];
  bool get isAnswered => currentAnswer != null;

  QuizInProgress copyWith({
    int? currentIndex,
    Map<String, String>? answers,
  }) {
    return QuizInProgress(
      activityId: activityId,
      exam: exam,
      currentIndex: currentIndex ?? this.currentIndex,
      answers: answers ?? this.answers,
    );
  }

  @override
  List<Object?> get props =>
      [activityId, exam, currentIndex, answers];
}

class QuizCompleted extends QuizState {
  final String activityId;
  final Exam exam;
  final Map<String, String> answers;
  final int correctCount;

  const QuizCompleted({
    required this.activityId,
    required this.exam,
    required this.answers,
    required this.correctCount,
  });

  int get totalCount => exam.questions.length;
  double get score => totalCount > 0 ? correctCount / totalCount : 0;

  @override
  List<Object?> get props =>
      [activityId, exam, answers, correctCount];
}

class QuizError extends QuizState {
  final String message;
  const QuizError(this.message);
  @override
  List<Object?> get props => [message];
}
