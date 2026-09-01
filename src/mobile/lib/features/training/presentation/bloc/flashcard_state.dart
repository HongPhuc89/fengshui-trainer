part of 'flashcard_bloc.dart';

abstract class FlashcardState extends Equatable {
  const FlashcardState();
  @override
  List<Object?> get props => [];
}

class FlashcardInitial extends FlashcardState {}

class FlashcardLoading extends FlashcardState {}

class FlashcardInProgress extends FlashcardState {
  final String activityId;
  final List<Flashcard> cards;
  final int currentIndex;
  final bool isFlipped;

  const FlashcardInProgress({
    required this.activityId,
    required this.cards,
    required this.currentIndex,
    required this.isFlipped,
  });

  Flashcard get currentCard => cards[currentIndex];
  int get total => cards.length;

  FlashcardInProgress copyWith({
    int? currentIndex,
    bool? isFlipped,
  }) {
    return FlashcardInProgress(
      activityId: activityId,
      cards: cards,
      currentIndex: currentIndex ?? this.currentIndex,
      isFlipped: isFlipped ?? this.isFlipped,
    );
  }

  @override
  List<Object?> get props =>
      [activityId, cards, currentIndex, isFlipped];
}

class FlashcardCompleted extends FlashcardState {
  final String activityId;
  final int totalCards;

  const FlashcardCompleted({
    required this.activityId,
    required this.totalCards,
  });

  @override
  List<Object?> get props => [activityId, totalCards];
}

class FlashcardError extends FlashcardState {
  final String message;
  const FlashcardError(this.message);
  @override
  List<Object?> get props => [message];
}
