import 'package:equatable/equatable.dart';

/// Flashcard model matching backend API structure
class Flashcard extends Equatable {
  final int id;
  final int chapterId;
  final String question;
  final String answer;
  final String? hint;
  final String? difficulty; // 'easy', 'medium', 'hard'
  final DateTime createdAt;
  final DateTime updatedAt;

  const Flashcard({
    required this.id,
    required this.chapterId,
    required this.question,
    required this.answer,
    this.hint,
    this.difficulty,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Flashcard.fromJson(Map<String, dynamic> json) {
    return Flashcard(
      id: json['id'] as int,
      chapterId: json['chapter_id'] as int? ?? json['chapterId'] as int,
      question: json['question'] as String,
      answer: json['answer'] as String,
      hint: json['hint'] as String?,
      difficulty: json['difficulty'] as String?,
      createdAt: DateTime.parse(
          json['created_at'] as String? ?? json['createdAt'] as String),
      updatedAt: DateTime.parse(
          json['updated_at'] as String? ?? json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'chapter_id': chapterId,
      'question': question,
      'answer': answer,
      if (hint != null) 'hint': hint,
      if (difficulty != null) 'difficulty': difficulty,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props =>
      [id, chapterId, question, answer, hint, difficulty];
}

/// FlashcardProgress model for local tracking
/// Stores user's learning progress for each flashcard
class FlashcardProgress extends Equatable {
  final int flashcardId;
  final int masteryLevel; // 0-5, where 5 is fully mastered
  final DateTime lastReviewed;
  final int reviewCount;
  final int correctCount;

  const FlashcardProgress({
    required this.flashcardId,
    required this.masteryLevel,
    required this.lastReviewed,
    required this.reviewCount,
    required this.correctCount,
  });

  factory FlashcardProgress.initial(int flashcardId) {
    return FlashcardProgress(
      flashcardId: flashcardId,
      masteryLevel: 0,
      lastReviewed: DateTime.now(),
      reviewCount: 0,
      correctCount: 0,
    );
  }

  factory FlashcardProgress.fromJson(Map<String, dynamic> json) {
    return FlashcardProgress(
      flashcardId: json['flashcard_id'] as int? ?? json['flashcardId'] as int,
      masteryLevel:
          json['mastery_level'] as int? ?? json['masteryLevel'] as int? ?? 0,
      lastReviewed: DateTime.parse(
          json['last_reviewed'] as String? ?? json['lastReviewed'] as String),
      reviewCount:
          json['review_count'] as int? ?? json['reviewCount'] as int? ?? 0,
      correctCount:
          json['correct_count'] as int? ?? json['correctCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'flashcard_id': flashcardId,
      'mastery_level': masteryLevel,
      'last_reviewed': lastReviewed.toIso8601String(),
      'review_count': reviewCount,
      'correct_count': correctCount,
    };
  }

  /// Create a new progress instance after answering correctly
  FlashcardProgress answerCorrect() {
    return FlashcardProgress(
      flashcardId: flashcardId,
      masteryLevel: (masteryLevel + 1).clamp(0, 5),
      lastReviewed: DateTime.now(),
      reviewCount: reviewCount + 1,
      correctCount: correctCount + 1,
    );
  }

  /// Create a new progress instance after answering incorrectly
  FlashcardProgress answerIncorrect() {
    return FlashcardProgress(
      flashcardId: flashcardId,
      masteryLevel: (masteryLevel - 1).clamp(0, 5),
      lastReviewed: DateTime.now(),
      reviewCount: reviewCount + 1,
      correctCount: correctCount,
    );
  }

  /// Calculate accuracy percentage
  double get accuracy {
    if (reviewCount == 0) return 0.0;
    return (correctCount / reviewCount) * 100;
  }

  @override
  List<Object?> get props =>
      [flashcardId, masteryLevel, lastReviewed, reviewCount, correctCount];
}
