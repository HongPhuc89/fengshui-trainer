import 'package:equatable/equatable.dart';

/// Quiz configuration model
class QuizConfig extends Equatable {

  const QuizConfig({
    required this.id,
    required this.chapterId,
    required this.questionCount,
    required this.easyPercentage,
    required this.mediumPercentage,
    required this.hardPercentage,
    required this.passingScore,
    required this.shuffleQuestions, required this.shuffleOptions, required this.showCorrectAnswers, required this.createdAt, required this.updatedAt, this.timeLimit,
  });

  factory QuizConfig.fromJson(Map<String, dynamic> json) {
    return QuizConfig(
      id: json['id'] as int? ?? 0,
      chapterId: (json['chapter_id'] ?? json['chapterId']) as int? ?? 0,
      questionCount: (json['question_count'] ?? json['questionCount']) as int? ?? 10,
      easyPercentage: (json['easy_percentage'] ?? json['easyPercentage']) as int? ?? 30,
      mediumPercentage: (json['medium_percentage'] ?? json['mediumPercentage']) as int? ?? 50,
      hardPercentage: (json['hard_percentage'] ?? json['hardPercentage']) as int? ?? 20,
      passingScore: (json['passing_score'] ?? json['passingScore']) as int? ?? 70,
      timeLimit: (json['time_limit'] ?? json['timeLimit']) as int?,
      shuffleQuestions: (json['shuffle_questions'] ?? json['shuffleQuestions']) as bool? ?? false,
      shuffleOptions: (json['shuffle_options'] ?? json['shuffleOptions']) as bool? ?? false,
      showCorrectAnswers: (json['show_correct_answers'] ?? json['showCorrectAnswers']) as bool? ?? true,
      createdAt: json['created_at'] != null || json['createdAt'] != null
          ? DateTime.parse((json['created_at'] ?? json['createdAt']) as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null || json['updatedAt'] != null
          ? DateTime.parse((json['updated_at'] ?? json['updatedAt']) as String)
          : DateTime.now(),
    );
  }
  final int id;
  final int chapterId;
  final int questionCount;
  final int easyPercentage;
  final int mediumPercentage;
  final int hardPercentage;
  final int passingScore;
  final int? timeLimit; // in seconds
  final bool shuffleQuestions;
  final bool shuffleOptions;
  final bool showCorrectAnswers;
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'chapter_id': chapterId,
      'question_count': questionCount,
      'easy_percentage': easyPercentage,
      'medium_percentage': mediumPercentage,
      'hard_percentage': hardPercentage,
      'passing_score': passingScore,
      if (timeLimit != null) 'time_limit': timeLimit,
      'shuffle_questions': shuffleQuestions,
      'shuffle_options': shuffleOptions,
      'show_correct_answers': showCorrectAnswers,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props =>
      [id, chapterId, questionCount, passingScore, timeLimit];
}

/// Quiz question model
class QuizQuestion extends Equatable {

  const QuizQuestion({
    required this.id,
    required this.question,
    required this.type,
    required this.options,
    required this.difficulty,
    required this.points,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      id: json['id'] as int? ?? 0,
      question: (json['question_text'] ?? json['question']) as String? ?? '',
      type: (json['question_type'] ?? json['type']) as String? ?? 'multiple_choice',
      options: json['options'], // Keep as dynamic
      difficulty: json['difficulty'] as String? ?? 'medium',
      points: json['points'] as int? ?? 1,
    );
  }
  final int id;
  final String question;
  final String type; // 'multiple_choice', 'multiple_answer', 'true_false'
  final dynamic options; // Can be List or Map depending on question type
  final String difficulty; // 'easy', 'medium', 'hard'
  final int points;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'question': question,
      'type': type,
      'options': options,
      'difficulty': difficulty,
      'points': points,
    };
  }

  /// Get options as raw objects
  List<dynamic> get rawOptions {
    if (options is List) {
      return options as List;
    }
    if (options is Map && options['options'] is List) {
      return (options as Map)['options'] as List;
    }
    return [];
  }

  /// Get options as QuizOption objects
  List<QuizOption> get quizOptions {
    final list = rawOptions;
    return List.generate(
      list.length,
      (index) => QuizOption.fromDynamic(list[index], index),
    );
  }

  /// Check if this is a multiple choice question
  bool get isMultipleChoice => type == 'multiple_choice';

  /// Check if this is a multiple answer question
  bool get isMultipleAnswer => type == 'multiple_answer';

  /// Check if this is a true/false question
  bool get isTrueFalse => type == 'true_false';

  @override
  List<Object?> get props => [id, question, type, difficulty, points];
}

class QuizOption {
  final String id;
  final String text;

  QuizOption({required this.id, required this.text});

  factory QuizOption.fromDynamic(dynamic data, int index) {
    if (data is Map) {
      return QuizOption(
        id: data['id']?.toString() ?? String.fromCharCode(97 + index),
        text: data['text']?.toString() ?? data.toString(),
      );
    }
    return QuizOption(
      id: String.fromCharCode(97 + index),
      text: data.toString(),
    );
  }
}

/// Quiz attempt model
class QuizAttempt extends Equatable {

  const QuizAttempt({
    required this.id,
    required this.userId,
    required this.chapterId,
    required this.questions,
    required this.startedAt,
    this.completedAt,
    this.score,
    this.passed,
    this.totalPoints,
    this.earnedPoints,
  });

  factory QuizAttempt.fromJson(Map<String, dynamic> json) {
    int toInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is num) return value.toInt();
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    return QuizAttempt(
      id: toInt(json['id']),
      userId: toInt(json['user_id'] ?? json['userId']),
      chapterId: toInt(json['chapter_id'] ?? json['chapterId']),
      questions: (json['questions'] as List? ?? [])
          .map((q) => QuizQuestion.fromJson(q as Map<String, dynamic>))
          .toList(),
      startedAt: DateTime.tryParse(
            (json['started_at'] ?? json['startedAt'] ?? '').toString(),
          ) ??
          DateTime.now(),
      completedAt: DateTime.tryParse(
        (json['completed_at'] ?? json['completedAt'] ?? '').toString(),
      ),
      score: (json['score'] as num?)?.toDouble(),
      passed: json['passed'] as bool?,
      totalPoints: toInt(json['total_points'] ?? json['totalPoints']),
      earnedPoints: toInt(json['earned_points'] ?? json['earnedPoints']),
    );
  }
  final int id;
  final int userId;
  final int chapterId;
  final List<QuizQuestion> questions;
  final DateTime startedAt;
  final DateTime? completedAt;
  final double? score;
  final bool? passed;
  final int? totalPoints;
  final int? earnedPoints;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'chapter_id': chapterId,
      'questions': questions.map((q) => q.toJson()).toList(),
      'started_at': startedAt.toIso8601String(),
      if (completedAt != null) 'completed_at': completedAt!.toIso8601String(),
      if (score != null) 'score': score,
      if (passed != null) 'passed': passed,
      if (totalPoints != null) 'total_points': totalPoints,
      if (earnedPoints != null) 'earned_points': earnedPoints,
    };
  }

  bool get isCompleted => completedAt != null;

  @override
  List<Object?> get props => [id, userId, chapterId, startedAt, completedAt];
}

/// Submit quiz request model
class SubmitQuizRequest { // questionId -> answer

  SubmitQuizRequest({
    required this.attemptId,
    required this.answers,
  });
  final int attemptId;
  final Map<int, dynamic> answers;

  Map<String, dynamic> toJson() {
    return {
      'attempt_id': attemptId,
      'answers': answers,
    };
  }
}

/// Quiz result for a single question
class QuizQuestionResult extends Equatable {

  const QuizQuestionResult({
    required this.questionId,
    required this.isCorrect,
    required this.pointsEarned,
    required this.userAnswer,
    this.correctAnswer,
  });

  factory QuizQuestionResult.fromJson(Map<String, dynamic> json) {
    int toInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is num) return value.toInt();
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    final correctAnswer = json['correct_answer'] ?? json['correctAnswer'];
    
    // Debug log
    print('[QuizResult] Parsing question ${json['question_id']}: correctAnswer = $correctAnswer');

    return QuizQuestionResult(
      questionId: toInt(json['question_id'] ?? json['questionId']),
      isCorrect: json['is_correct'] as bool? ?? json['isCorrect'] as bool? ?? false,
      pointsEarned: toInt(json['points_earned'] ?? json['pointsEarned']),
      userAnswer: json['user_answer'] ?? json['userAnswer'],
      correctAnswer: correctAnswer,
    );
  }
  final int questionId;
  final bool isCorrect;
  final int pointsEarned;
  final dynamic userAnswer;
  final dynamic correctAnswer;

  @override
  List<Object?> get props => [questionId, isCorrect, pointsEarned];
}

/// Submit quiz response model
class SubmitQuizResponse extends Equatable {

  const SubmitQuizResponse({
    required this.attemptId,
    required this.score,
    required this.percentage,
    required this.passed,
    required this.totalPoints,
    required this.earnedPoints,
    required this.correctAnswers,
    required this.totalQuestions,
    required this.results,
    required this.completedAt,
  });

  factory SubmitQuizResponse.fromJson(Map<String, dynamic> json) {
    // Helper to safely parse int
    int toInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is num) return value.toInt();
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    // Helper to safely parse double
    double todouble(dynamic value) {
      if (value == null) return 0.0;
      if (value is double) return value;
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0.0;
      return 0.0;
    }

    final earnedPoints = toInt(json['earned_points'] ?? json['earnedPoints'] ?? json['score']);
    final totalPoints = toInt(json['total_points'] ?? json['totalPoints']);
    
    // Parse results first
    final results = (json['results'] as List?)
            ?.map((r) => QuizQuestionResult.fromJson(r as Map<String, dynamic>))
            .toList() ??
        [];
    
    // Calculate correct answers from results (don't trust backend value)
    final correctAnswers = results.where((r) => r.isCorrect).length;
    
    // Use percentage from JSON or calculate it
    double percentage = todouble(json['percentage'] ?? json['percentage_score']);
    if (percentage == 0 && totalPoints > 0) {
      percentage = (earnedPoints / totalPoints) * 100;
    }

    return SubmitQuizResponse(
      attemptId: toInt(json['attempt_id'] ?? json['attemptId']),
      score: todouble(json['score']),
      percentage: percentage,
      passed: json['passed'] as bool? ?? false,
      totalPoints: totalPoints,
      earnedPoints: earnedPoints,
      correctAnswers: correctAnswers, // Use calculated value
      totalQuestions: toInt(json['total_questions'] ?? json['totalQuestions']),
      results: results,
      completedAt: DateTime.tryParse(
            (json['completed_at'] ?? json['completedAt'] ?? '').toString(),
          ) ??
          DateTime.now(),
    );
  }
  final int attemptId;
  final double score;
  final double percentage;
  final bool passed;
  final int totalPoints;
  final int earnedPoints;
  final int correctAnswers;
  final int totalQuestions;
  final List<QuizQuestionResult> results;
  final DateTime completedAt;

  @override
  List<Object?> get props =>
      [attemptId, score, percentage, passed, totalPoints, earnedPoints];
}
