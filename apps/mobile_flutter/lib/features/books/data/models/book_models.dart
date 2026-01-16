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

  Book copyWith({
    int? id,
    String? title,
    String? description,
    String? author,
    String? coverImage,
    int? totalChapters,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Book(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      author: author ?? this.author,
      coverImage: coverImage ?? this.coverImage,
      totalChapters: totalChapters ?? this.totalChapters,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props =>
      [id, title, description, coverImage, totalChapters, createdAt, updatedAt];
}

class Chapter extends Equatable {

  const Chapter({
    required this.id,
    required this.bookId,
    required this.title,
    required this.orderIndex,
    required this.createdAt, required this.updatedAt, this.content,
    this.description,
    this.files,
    this.infographicFile,
  });

  factory Chapter.fromJson(Map<String, dynamic> json) {
    // Parse files array if present
    List<ChapterFile>? filesList;
    
    // Handle 'files' array (old format)
    if (json['files'] != null && json['files'] is List) {
      filesList = (json['files'] as List)
          .map((fileJson) => ChapterFile.fromJson(fileJson as Map<String, dynamic>))
          .toList();
    } 
    // Handle 'file' single object (new format)
    else if (json['file'] != null && json['file'] is Map) {
      filesList = [ChapterFile.fromJson(json['file'] as Map<String, dynamic>)];
    }

    // Handle 'infographic_file'
    ChapterFile? infoFile;
    if (json['infographic_file'] != null && json['infographic_file'] is Map) {
      infoFile = ChapterFile.fromJson(json['infographic_file'] as Map<String, dynamic>);
    }

    return Chapter(
      id: json['id'] as int,
      bookId: json['book_id'] as int,
      title: json['title'] as String,
      orderIndex: json['order'] as int,
      content: json['content'] as String?,
      description: json['description'] as String?,
      files: filesList,
      infographicFile: infoFile,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
  final int id;
  final int bookId;
  final String title;
  final int orderIndex;
  final String? content;
  final String? description;
  final List<ChapterFile>? files;
  final ChapterFile? infographicFile;
  final DateTime createdAt;
  final DateTime updatedAt;

  @override
  List<Object?> get props => [id, bookId, title, orderIndex, infographicFile];
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
      chapterId: json['chapter_id'] as int? ?? 0, // May not be present in file object
      fileName: json['original_name'] as String? ?? json['filename'] as String,
      fileUrl: json['path'] as String,
      fileType: json['mimetype'] as String? ?? 'application/pdf',
      fileSize: json['size'] as int?,
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
