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
    final chapterId = int.tryParse(json['chapter_id']?.toString() ?? 
                                   json['chapterId']?.toString() ?? '') ?? 0;
    
    return ReadingProgress(
      id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
      userId: int.tryParse(json['user_id']?.toString() ?? 
                           json['userId']?.toString() ?? '') ?? 0,
      chapterId: chapterId,
      currentPage:
          int.tryParse(json['current_page']?.toString() ?? 
                       json['currentPage']?.toString() ?? '') ?? 1,
      totalPages:
          int.tryParse(json['total_pages']?.toString() ?? 
                       json['totalPages']?.toString() ?? '') ?? 0,
      scrollPosition:
          double.tryParse(json['scroll_position']?.toString() ?? 
                          json['scrollPosition']?.toString() ?? '') ?? 0.0,
      lastReadAt: DateTime.parse(
          json['last_read_at'] as String? ?? json['lastReadAt'] as String? ?? DateTime.now().toIso8601String(),),
      readingTime:
          int.tryParse(json['reading_time']?.toString() ?? 
                       json['readingTime']?.toString() ?? '') ?? 0,
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
