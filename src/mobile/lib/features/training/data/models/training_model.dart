import '../../domain/entities/training.dart';

class TrainingActivityModel extends TrainingActivity {
  const TrainingActivityModel({
    required super.id,
    required super.type,
    required super.totalCount,
  });

  factory TrainingActivityModel.fromJson(Map<String, dynamic> json) {
    final typeStr = (json['type'] as String? ?? '').toLowerCase();
    final type = typeStr == 'quiz' ? ActivityType.quiz : ActivityType.flashcard;

    int count = 0;
    if (json['stats'] is Map) {
      final stats = json['stats'] as Map<String, dynamic>;
      count = stats['total_count'] as int? ??
          stats['question_count'] as int? ?? 0;
    }

    return TrainingActivityModel(
      id: json['id'].toString(),
      type: type,
      totalCount: count,
    );
  }
}

class TrainingSetModel extends TrainingSet {
  TrainingSetModel({required super.id, required super.activities});

  factory TrainingSetModel.fromJson(Map<String, dynamic> json) {
    final activitiesRaw =
        json['activities'] as List<dynamic>? ?? [];
    final activities = activitiesRaw
        .map((a) => TrainingActivityModel.fromJson(
            a as Map<String, dynamic>))
        .toList();
    return TrainingSetModel(
      id: json['id'].toString(),
      activities: activities,
    );
  }
}

class FlashcardModel extends Flashcard {
  const FlashcardModel({
    required super.id,
    required super.front,
    required super.back,
  });

  factory FlashcardModel.fromJson(Map<String, dynamic> json) {
    return FlashcardModel(
      id: json['id'].toString(),
      front: json['front'] as String? ??
          json['question'] as String? ?? '',
      back: json['back'] as String? ??
          json['answer'] as String? ?? '',
    );
  }
}

class QuizChoiceModel extends QuizChoice {
  const QuizChoiceModel({required super.id, required super.text});

  factory QuizChoiceModel.fromJson(Map<String, dynamic> json) {
    return QuizChoiceModel(
      id: json['id'].toString(),
      text: json['text'] as String? ??
          json['content'] as String? ?? '',
    );
  }
}

class QuizQuestionModel extends QuizQuestion {
  const QuizQuestionModel({
    required super.id,
    required super.text,
    required super.choices,
    required super.correctChoiceId,
    super.explanation,
  });

  factory QuizQuestionModel.fromJson(Map<String, dynamic> json) {
    final choicesRaw =
        json['choices'] as List<dynamic>? ??
        json['answers'] as List<dynamic>? ?? [];
    final choices = choicesRaw
        .map((c) =>
            QuizChoiceModel.fromJson(c as Map<String, dynamic>))
        .toList();

    // Try to find correct answer id
    String correctId = '';
    for (final c in choicesRaw) {
      final map = c as Map<String, dynamic>;
      if (map['is_correct'] == true) {
        correctId = map['id'].toString();
        break;
      }
    }
    if (correctId.isEmpty && json['correct_answer'] != null) {
      correctId = json['correct_answer'].toString();
    }

    return QuizQuestionModel(
      id: json['id'].toString(),
      text: json['text'] as String? ??
          json['question'] as String? ?? '',
      choices: choices,
      correctChoiceId: correctId,
      explanation: json['explanation'] as String?,
    );
  }
}

class ExamModel extends Exam {
  ExamModel({required super.id, required super.questions});

  factory ExamModel.fromJson(Map<String, dynamic> json) {
    final questionsRaw =
        json['questions'] as List<dynamic>? ??
        json['practice_questions'] as List<dynamic>? ?? [];
    final questions = questionsRaw
        .map((q) =>
            QuizQuestionModel.fromJson(q as Map<String, dynamic>))
        .toList();
    return ExamModel(
      id: json['id'].toString(),
      questions: questions,
    );
  }
}
