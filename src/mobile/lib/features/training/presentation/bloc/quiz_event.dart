part of 'quiz_bloc.dart';

abstract class QuizEvent extends Equatable {
  const QuizEvent();
  @override
  List<Object?> get props => [];
}

class LoadExam extends QuizEvent {
  final String activityId;
  const LoadExam(this.activityId);
  @override
  List<Object?> get props => [activityId];
}

class AnswerQuestion extends QuizEvent {
  final String choiceId;
  const AnswerQuestion(this.choiceId);
  @override
  List<Object?> get props => [choiceId];
}

class AdvanceQuestion extends QuizEvent {
  const AdvanceQuestion();
}

class RestartQuiz extends QuizEvent {
  const RestartQuiz();
}
