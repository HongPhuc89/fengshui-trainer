import 'package:equatable/equatable.dart';

/// Mindmap model matching backend API structure
class Mindmap extends Equatable {
  const Mindmap({
    required this.id,
    required this.chapterId,
    required this.title,
    required this.markdownContent,
    required this.createdAt,
    required this.updatedAt,
    this.structure,
  });

  factory Mindmap.fromJson(Map<String, dynamic> json) {
    return Mindmap(
      id: json['id'] as int,
      chapterId: json['chapter_id'] as int? ?? json['chapterId'] as int,
      title: json['title'] as String,
      markdownContent: json['markdown_content'] as String? ?? json['markdownContent'] as String? ?? '',
      structure: json['structure'],
      createdAt: DateTime.parse(
        json['created_at'] as String? ?? json['createdAt'] as String,
      ),
      updatedAt: DateTime.parse(
        json['updated_at'] as String? ?? json['updatedAt'] as String,
      ),
    );
  }

  final int id;
  final int chapterId;
  final String title;
  final String markdownContent;
  final dynamic structure; // JSON structure (fallback if markdown not available)
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'chapter_id': chapterId,
      'title': title,
      'markdown_content': markdownContent,
      if (structure != null) 'structure': structure,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [id, chapterId, title, markdownContent, structure];
}
