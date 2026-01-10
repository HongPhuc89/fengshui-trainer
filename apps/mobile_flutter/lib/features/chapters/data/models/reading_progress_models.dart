import 'package:equatable/equatable.dart';

class ReadingProgress extends Equatable {

  const ReadingProgress({
    required this.id,
    required this.userId,
    required this.chapterId,
    required this.currentPage,
    required this.totalPages,
    required this.lastReadAt, this.scrollPosition = 0.0,
    this.readingTime = 0,
    this.isCompleted = false,
  });

  factory ReadingProgress.fromJson(Map<String, dynamic> json) {
    final chapterId = (json['chapter_id'] as num?)?.toInt() ?? 
                       (json['chapterId'] as num?)?.toInt() ?? 0;
    
    return ReadingProgress(
      id: (json['id'] as num?)?.toInt() ?? 0,
      userId: (json['user_id'] as num?)?.toInt() ?? 
              (json['userId'] as num?)?.toInt() ?? 0,
      chapterId: chapterId,
      currentPage:
          (json['current_page'] as num?)?.toInt() ?? 
          (json['currentPage'] as num?)?.toInt() ?? 1,
      totalPages:
          (json['total_pages'] as num?)?.toInt() ?? 
          (json['totalPages'] as num?)?.toInt() ?? 0,
      scrollPosition:
          (json['scroll_position'] ?? json['scrollPosition'] ?? 0.0).toDouble(),
      lastReadAt: DateTime.parse(
          json['last_read_at'] as String? ?? json['lastReadAt'] as String? ?? DateTime.now().toIso8601String(),),
      readingTime:
          (json['reading_time'] as num?)?.toInt() ?? 
          (json['readingTime'] as num?)?.toInt() ?? 0,
      isCompleted: json['is_completed'] as bool? ??
          json['isCompleted'] as bool? ??
          json['completed'] as bool? ??
          false,
    );
  }
  final int id;
  final int userId;
  final int chapterId;
  final int currentPage;
  final int totalPages;
  final double scrollPosition;
  final DateTime lastReadAt;
  final int readingTime;
  final bool isCompleted;

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

  UpdateProgressRequest({
    required this.currentPage,
    required this.totalPages,
    this.readingTime,
  });
  final int currentPage;
  final int totalPages;
  final int? readingTime;

  Map<String, dynamic> toJson() {
    return {
      'current_page': currentPage,
      'total_pages': totalPages,
      if (readingTime != null) 'reading_time': readingTime,
    };
  }
}
