import '../../domain/entities/book.dart';

class BookCategoryModel extends BookCategory {
  const BookCategoryModel({
    required super.publicId,
    required super.title,
    required super.slug,
  });

  factory BookCategoryModel.fromJson(Map<String, dynamic> json) {
    return BookCategoryModel(
      publicId: json['public_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
    );
  }
}

class BookModel extends Book {
  const BookModel({
    required super.slug,
    required super.title,
    required super.author,
    super.coverImageUrl,
    super.category,
    required super.priceLt,
    required super.isVipOnly,
    required super.hasPurchased,
    required super.isNewRelease,
    required super.chapterCount,
    super.description,
  });

  factory BookModel.fromJson(Map<String, dynamic> json) {
    BookCategory? cat;
    if (json['category'] is Map) {
      cat = BookCategoryModel.fromJson(
        json['category'] as Map<String, dynamic>,
      );
    }
    return BookModel(
      slug: json['slug'] as String,
      title: json['title'] as String,
      author: json['author'] as String? ?? '',
      coverImageUrl: json['cover_image'] as String?,
      category: cat,
      priceLt: json['price_lt'] as int? ?? 0,
      isVipOnly: json['is_vip_only'] as bool? ?? false,
      hasPurchased: json['has_purchased'] as bool? ?? false,
      isNewRelease: json['is_new_release'] as bool? ?? false,
      chapterCount: json['chapter_count'] as int? ?? 0,
      description: json['description'] as String?,
    );
  }
}

class BookChapterMetaModel extends BookChapterMeta {
  const BookChapterMetaModel({
    required super.order,
    required super.title,
    required super.pageCount,
    required super.isDemo,
    required super.canAccess,
    required super.isCompleted,
    required super.hasTrainingSet,
  });

  factory BookChapterMetaModel.fromJson(Map<String, dynamic> json) {
    return BookChapterMetaModel(
      order: json['order'] as int,
      title: json['title'] as String,
      pageCount: json['page_count'] as int? ?? 0,
      isDemo: json['is_demo'] as bool? ?? false,
      canAccess: json['can_access'] as bool? ?? false,
      isCompleted: json['is_completed'] as bool? ?? false,
      hasTrainingSet: json['has_training_set'] as bool? ?? false,
    );
  }
}

class BookDetailModel extends BookDetail {
  const BookDetailModel({
    required super.slug,
    required super.title,
    required super.author,
    super.coverImageUrl,
    super.smallCoverUrl,
    super.category,
    required super.priceLt,
    required super.hasPurchased,
    required super.isNewRelease,
    super.isFree,
    super.description,
    required super.chapters,
    super.lastReadChapterOrder,
  });

  factory BookDetailModel.fromJson(Map<String, dynamic> json) {
    BookCategory? cat;
    if (json['category'] is Map) {
      cat = BookCategoryModel.fromJson(
        json['category'] as Map<String, dynamic>,
      );
    }

    final chaptersRaw = json['chapters'] as List<dynamic>? ?? [];
    final chapters = chaptersRaw
        .map((c) => BookChapterMetaModel.fromJson(c as Map<String, dynamic>))
        .toList();

    // Determine lastReadChapterOrder from progress field if available
    int? lastChapter;
    if (json['reading_progress'] is Map) {
      lastChapter = json['reading_progress']['chapter_order'] as int?;
    }

    return BookDetailModel(
      slug: json['slug'] as String,
      title: json['title'] as String,
      author: json['author'] as String? ?? '',
      coverImageUrl: json['cover_image'] as String?,
      smallCoverUrl: json['small_cover'] as String?,
      category: cat,
      priceLt: json['price_lt'] as int? ?? 0,
      hasPurchased: json['has_purchased'] as bool? ?? false,
      isNewRelease: json['is_new_release'] as bool? ?? false,
      isFree: json['is_free'] as bool? ?? false,
      description: json['description'] as String?,
      chapters: chapters,
      lastReadChapterOrder: lastChapter,
    );
  }
}

class BookChapterContentModel extends BookChapterContent {
  const BookChapterContentModel({
    required super.order,
    required super.title,
    required super.pageCount,
    required super.hasTrainingSet,
    required super.encryptedFileUrl,
    required super.decryptKeyBase64,
    required super.ivBase64,
  });

  factory BookChapterContentModel.fromJson(
    Map<String, dynamic> chapterJson,
    Map<String, dynamic> keyJson,
  ) {
    return BookChapterContentModel(
      order: chapterJson['order'] as int,
      title: chapterJson['title'] as String,
      pageCount: chapterJson['page_count'] as int? ?? 0,
      hasTrainingSet: chapterJson['has_training_set'] as bool? ?? false,
      // BookChapterContentSerializer's own 'file_url' is the PLAIN, never-
      // encrypted file_path — reading it here would hand an unencrypted PDF
      // to PdfDecryptionService.decrypt(), which unconditionally attempts
      // AES-256-GCM decryption on whatever URL it's given. encrypted_cdn_url
      // is the one actually meant for that.
      encryptedFileUrl: chapterJson['encrypted_cdn_url'] as String? ?? '',
      // The decrypt-key endpoint's field is key_b64, not key.
      decryptKeyBase64: keyJson['key_b64'] as String,
      // Never in the encrypted file itself — only ever on this response.
      ivBase64: keyJson['iv_b64'] as String,
    );
  }
}

class ReadingProgressModel extends ReadingProgress {
  const ReadingProgressModel({
    required super.bookSlug,
    required super.chapterOrder,
    required super.currentPage,
    super.updatedAt,
  });

  factory ReadingProgressModel.fromJson(
    String bookSlug,
    Map<String, dynamic> json,
  ) {
    return ReadingProgressModel(
      bookSlug: bookSlug,
      chapterOrder: json['chapter_order'] as int? ?? 1,
      currentPage: json['current_page'] as int? ?? 1,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
    );
  }
}

class RecentlyReadBookModel extends RecentlyReadBook {
  RecentlyReadBookModel({
    required Book book,
    required super.chapterOrder,
    required super.currentPage,
  }) : super(book: book);

  factory RecentlyReadBookModel.fromJson(Map<String, dynamic> json) {
    final book = BookModel.fromJson(
      json['book'] as Map<String, dynamic>? ?? json,
    );
    return RecentlyReadBookModel(
      book: book,
      chapterOrder: json['chapter_order'] as int? ?? 1,
      currentPage: json['current_page'] as int? ?? 1,
    );
  }
}
