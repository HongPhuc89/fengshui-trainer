import 'package:equatable/equatable.dart';

class Book extends Equatable {

  const Book({
    required this.id,
    required this.title,
    required this.createdAt, required this.updatedAt, this.description,
    this.author,
    this.coverImage,
    this.totalChapters = 0,
  });

  factory Book.fromJson(Map<String, dynamic> json) {
    // Extract cover image from cover_file.path
    String? coverImg;
    if (json['cover_file'] != null && json['cover_file'] is Map) {
      coverImg = json['cover_file']['path'] as String?;
    }

    return Book(
      id: json['id'] as int,
      title: json['title'] as String,
      description: json['description'] as String?,
      author: json['author'] as String?,
      coverImage: coverImg,
      totalChapters: json['chapter_count'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
  final int id;
  final String title;
  final String? description;
  final String? author;
  final String? coverImage;
  final int totalChapters;
  final DateTime createdAt;
  final DateTime updatedAt;

  @override
  List<Object?> get props =>
      [id, title, description, coverImage, totalChapters];
}

class Chapter extends Equatable {

  const Chapter({
    required this.id,
    required this.bookId,
    required this.title,
    required this.orderIndex,
    required this.createdAt, required this.updatedAt, this.content,
    this.files,
  });

  factory Chapter.fromJson(Map<String, dynamic> json) {
    return Chapter(
      id: json['id'] as int,
      bookId: json['book_id'] as int,
      title: json['title'] as String,
      orderIndex: json['order'] as int,
      content: json['content'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
  final int id;
  final int bookId;
  final String title;
  final int orderIndex;
  final String? content;
  final List<ChapterFile>? files;
  final DateTime createdAt;
  final DateTime updatedAt;

  @override
  List<Object?> get props => [id, bookId, title, orderIndex];
}

class ChapterFile extends Equatable {

  const ChapterFile({
    required this.id,
    required this.chapterId,
    required this.fileName,
    required this.fileUrl,
    required this.fileType,
    required this.updatedAt, this.fileSize,
  });

  factory ChapterFile.fromJson(Map<String, dynamic> json) {
    return ChapterFile(
      id: json['id'] as int,
      chapterId: json['chapter_id'] as int,
      fileName: json['file_name'] as String,
      fileUrl: json['file_url'] as String,
      fileType: json['file_type'] as String,
      fileSize: json['file_size'] as int?,
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
  final int id;
  final int chapterId;
  final String fileName;
  final String fileUrl;
  final String fileType;
  final int? fileSize;
  final DateTime updatedAt;

  @override
  List<Object?> get props => [id, chapterId, fileName, fileUrl];
}
