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
      id: json['id'] as int,
      question: json['question'] as String,
      type: json['type'] as String,
      options: json['options'], // Keep as dynamic
      difficulty: json['difficulty'] as String,
      points: json['points'] as int,
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

  /// Get options as a list of strings (for multiple choice/answer)
  List<String> get optionsList {
    if (options is List) {
      return (options as List).map((e) => e.toString()).toList();
    }
    return [];
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
    return QuizAttempt(
      id: json['id'] as int,
      userId: json['user_id'] as int? ?? json['userId'] as int,
      chapterId: json['chapter_id'] as int? ?? json['chapterId'] as int,
      questions: (json['questions'] as List)
          .map((q) => QuizQuestion.fromJson(q as Map<String, dynamic>))
          .toList(),
      startedAt: DateTime.parse(
          json['started_at'] as String? ?? json['startedAt'] as String,),
      completedAt: json['completed_at'] != null || json['completedAt'] != null
          ? DateTime.parse(
              json['completed_at'] as String? ?? json['completedAt'] as String,)
          : null,
      score: (json['score'] as num?)?.toDouble(),
      passed: json['passed'] as bool?,
      totalPoints: json['total_points'] as int? ?? json['totalPoints'] as int?,
      earnedPoints:
          json['earned_points'] as int? ?? json['earnedPoints'] as int?,
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
    return QuizQuestionResult(
      questionId: json['question_id'] as int? ?? json['questionId'] as int,
      isCorrect: json['is_correct'] as bool? ?? json['isCorrect'] as bool,
      pointsEarned:
          json['points_earned'] as int? ?? json['pointsEarned'] as int,
      userAnswer: json['user_answer'] ?? json['userAnswer'],
      correctAnswer: json['correct_answer'] ?? json['correctAnswer'],
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
    required this.passed,
    required this.totalPoints,
    required this.earnedPoints,
    required this.correctAnswers,
    required this.totalQuestions,
    required this.results,
    required this.completedAt,
  });

  factory SubmitQuizResponse.fromJson(Map<String, dynamic> json) {
    return SubmitQuizResponse(
      attemptId: json['attempt_id'] as int? ?? json['attemptId'] as int,
      score: (json['score'] as num).toDouble(),
      passed: json['passed'] as bool,
      totalPoints: json['total_points'] as int? ?? json['totalPoints'] as int,
      earnedPoints:
          json['earned_points'] as int? ?? json['earnedPoints'] as int,
      correctAnswers:
          json['correct_answers'] as int? ?? json['correctAnswers'] as int,
      totalQuestions:
          json['total_questions'] as int? ?? json['totalQuestions'] as int,
      results: (json['results'] as List)
          .map((r) => QuizQuestionResult.fromJson(r as Map<String, dynamic>))
          .toList(),
      completedAt: DateTime.parse(
          json['completed_at'] as String? ?? json['completedAt'] as String,),
    );
  }
  final int attemptId;
  final double score;
  final bool passed;
  final int totalPoints;
  final int earnedPoints;
  final int correctAnswers;
  final int totalQuestions;
  final List<QuizQuestionResult> results;
  final DateTime completedAt;

  @override
  List<Object?> get props =>
      [attemptId, score, passed, totalPoints, earnedPoints];
}
