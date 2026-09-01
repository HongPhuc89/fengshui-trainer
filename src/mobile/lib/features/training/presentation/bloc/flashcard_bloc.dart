import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../domain/entities/training.dart';
import '../../domain/repositories/training_repository.dart';

part 'flashcard_event.dart';
part 'flashcard_state.dart';

@injectable
class FlashcardBloc extends Bloc<FlashcardEvent, FlashcardState> {
  final TrainingRepository _repository;

  FlashcardBloc(this._repository) : super(FlashcardInitial()) {
    on<LoadFlashcards>(_onLoad);
    on<FlipCard>(_onFlip);
    on<NextCard>(_onNext);
    on<PreviousCard>(_onPrevious);
    on<RestartSession>(_onRestart);
  }

  Future<void> _onLoad(
      LoadFlashcards event, Emitter<FlashcardState> emit) async {
    emit(FlashcardLoading());
    final result =
        await _repository.getFlashcards(event.activityId);
    result.fold(
      (failure) => emit(FlashcardError(failure.message)),
      (cards) {
        if (cards.isEmpty) {
          emit(const FlashcardError('Không có thẻ nào'));
          return;
        }
        emit(FlashcardInProgress(
          activityId: event.activityId,
          cards: cards,
          currentIndex: 0,
          isFlipped: false,
        ));
      },
    );
  }

  void _onFlip(FlipCard event, Emitter<FlashcardState> emit) {
    final s = state;
    if (s is FlashcardInProgress) {
      emit(s.copyWith(isFlipped: !s.isFlipped));
    }
  }

  void _onNext(NextCard event, Emitter<FlashcardState> emit) {
    final s = state;
    if (s is FlashcardInProgress) {
      final next = s.currentIndex + 1;
      if (next >= s.cards.length) {
        emit(FlashcardCompleted(
            activityId: s.activityId, totalCards: s.cards.length));
      } else {
        emit(s.copyWith(currentIndex: next, isFlipped: false));
      }
    }
  }

  void _onPrevious(PreviousCard event, Emitter<FlashcardState> emit) {
    final s = state;
    if (s is FlashcardInProgress && s.currentIndex > 0) {
      emit(s.copyWith(
          currentIndex: s.currentIndex - 1, isFlipped: false));
    }
  }

  void _onRestart(RestartSession event, Emitter<FlashcardState> emit) {
    final s = state;
    final activityId = s is FlashcardCompleted
        ? s.activityId
        : s is FlashcardInProgress
            ? s.activityId
            : null;
    if (activityId != null) {
      add(LoadFlashcards(activityId));
    }
  }
}
