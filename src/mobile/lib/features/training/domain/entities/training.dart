import 'package:equatable/equatable.dart';

enum ActivityType { flashcard, quiz }

class TrainingActivity extends Equatable {
  final String id;
  final ActivityType type;
  final int totalCount; // flashcard: card count, quiz: question count

  const TrainingActivity({
    required this.id,
    required this.type,
    required this.totalCount,
  });

  @override
  List<Object?> get props => [id, type];
}

class TrainingSet extends Equatable {
  final String id;
  final List<TrainingActivity> activities;

  const TrainingSet({required this.id, required this.activities});

  @override
  List<Object?> get props => [id];
}

class Flashcard extends Equatable {
  final String id;
  final String front;
  final String back;

  const Flashcard({
    required this.id,
    required this.front,
    required this.back,
  });

  @override
  List<Object?> get props => [id];
}

class QuizQuestion extends Equatable {
  final String id;
  final String text;
  final List<QuizChoice> choices;
  final String correctChoiceId;
  final String? explanation;

  const QuizQuestion({
    required this.id,
    required this.text,
    required this.choices,
    required this.correctChoiceId,
    this.explanation,
  });

  @override
  List<Object?> get props => [id];
}

class QuizChoice extends Equatable {
  final String id;
  final String text;

  const QuizChoice({required this.id, required this.text});

  @override
  List<Object?> get props => [id, text];
}

class Exam extends Equatable {
  final String id;
  final List<QuizQuestion> questions;

  const Exam({required this.id, required this.questions});

  @override
  List<Object?> get props => [id];
}
