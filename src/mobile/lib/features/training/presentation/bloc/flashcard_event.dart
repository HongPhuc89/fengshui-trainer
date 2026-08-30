part of 'flashcard_bloc.dart';

abstract class FlashcardEvent extends Equatable {
  const FlashcardEvent();
  @override
  List<Object?> get props => [];
}

class LoadFlashcards extends FlashcardEvent {
  final String activityId;
  const LoadFlashcards(this.activityId);
  @override
  List<Object?> get props => [activityId];
}

class FlipCard extends FlashcardEvent {
  const FlipCard();
}

class NextCard extends FlashcardEvent {
  const NextCard();
}

class PreviousCard extends FlashcardEvent {
  const PreviousCard();
}

class RestartSession extends FlashcardEvent {
  const RestartSession();
}
