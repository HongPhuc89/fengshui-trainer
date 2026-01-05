import 'package:equatable/equatable.dart';

class ReadingProgress extends Equatable {
  final int id;
  final int userId;
  final int chapterId;
  final int currentPage;
  final int totalPages;
  final double scrollPosition;
  final DateTime lastReadAt;
  final int readingTime;
  final bool isCompleted;

  const ReadingProgress({
    required this.id,
    required this.userId,
    required this.chapterId,
    required this.currentPage,
    required this.totalPages,
    this.scrollPosition = 0.0,
    required this.lastReadAt,
    this.readingTime = 0,
    this.isCompleted = false,
  });

  factory ReadingProgress.fromJson(Map<String, dynamic> json) {
    return ReadingProgress(
      id: json['id'] as int,
      userId: json['user_id'] as int? ?? json['userId'] as int,
      chapterId: json['chapter_id'] as int? ?? json['chapterId'] as int,
      currentPage:
          json['current_page'] as int? ?? json['currentPage'] as int? ?? 1,
      totalPages:
          json['total_pages'] as int? ?? json['totalPages'] as int? ?? 0,
      scrollPosition:
          (json['scroll_position'] ?? json['scrollPosition'] ?? 0.0).toDouble(),
      lastReadAt: DateTime.parse(
          json['last_read_at'] as String? ?? json['lastReadAt'] as String),
      readingTime:
          json['reading_time'] as int? ?? json['readingTime'] as int? ?? 0,
      isCompleted: json['is_completed'] as bool? ??
          json['isCompleted'] as bool? ??
          false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'chapter_id': chapterId,
      'current_page': currentPage,
      'total_pages': totalPages,
      'scroll_position': scrollPosition,
      'reading_time': readingTime,
      'is_completed': isCompleted,
    };
  }

  @override
  List<Object?> get props =>
      [id, chapterId, currentPage, totalPages, isCompleted];
}

class UpdateProgressRequest {
  final int currentPage;
  final int totalPages;
  final int? readingTime;

  UpdateProgressRequest({
    required this.currentPage,
    required this.totalPages,
    this.readingTime,
  });

  Map<String, dynamic> toJson() {
    return {
      'current_page': currentPage,
      'total_pages': totalPages,
      if (readingTime != null) 'reading_time': readingTime,
    };
  }
}
