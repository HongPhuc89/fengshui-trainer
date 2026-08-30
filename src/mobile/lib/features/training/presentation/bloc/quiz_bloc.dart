import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../domain/entities/training.dart';
import '../../domain/repositories/training_repository.dart';

part 'quiz_event.dart';
part 'quiz_state.dart';

@injectable
class QuizBloc extends Bloc<QuizEvent, QuizState> {
  final TrainingRepository _repository;

  QuizBloc(this._repository) : super(QuizInitial()) {
    on<LoadExam>(_onLoad);
    on<AnswerQuestion>(_onAnswer);
    on<AdvanceQuestion>(_onAdvance);
    on<RestartQuiz>(_onRestart);
  }

  Future<void> _onLoad(
      LoadExam event, Emitter<QuizState> emit) async {
    emit(QuizLoading());
    final result = await _repository.getExam(event.activityId);
    result.fold(
      (failure) => emit(QuizError(failure.message)),
      (exam) {
        if (exam.questions.isEmpty) {
          emit(const QuizError('Không có câu hỏi nào'));
          return;
        }
        emit(QuizInProgress(
          activityId: event.activityId,
          exam: exam,
          currentIndex: 0,
          answers: const {},
        ));
      },
    );
  }

  void _onAnswer(
      AnswerQuestion event, Emitter<QuizState> emit) {
    final s = state;
    if (s is! QuizInProgress || s.isAnswered) return;

    final newAnswers = Map<String, String>.from(s.answers)
      ..[s.exam.questions[s.currentIndex].id] = event.choiceId;

    emit(s.copyWith(answers: newAnswers));
  }

  void _onAdvance(
      AdvanceQuestion event, Emitter<QuizState> emit) {
    final s = state;
    if (s is! QuizInProgress || !s.isAnswered) return;

    if (s.currentIndex + 1 >= s.exam.questions.length) {
      // All answered — compute score
      int correct = 0;
      for (final q in s.exam.questions) {
        if (s.answers[q.id] == q.correctChoiceId) correct++;
      }
      emit(QuizCompleted(
        activityId: s.activityId,
        exam: s.exam,
        answers: s.answers,
        correctCount: correct,
      ));
    } else {
      emit(s.copyWith(currentIndex: s.currentIndex + 1));
    }
  }

  void _onRestart(
      RestartQuiz event, Emitter<QuizState> emit) {
    final s = state;
    final activityId = s is QuizCompleted
        ? s.activityId
        : s is QuizInProgress
            ? s.activityId
            : null;
    if (activityId != null) add(LoadExam(activityId));
  }
}
