import 'package:equatable/equatable.dart';

class BookCategory extends Equatable {
  // The API exposes public_id/title, never the internal integer pk — see
  // BaseModel on the server. Field names mirror the wire format so the cache
  // and the network response can share one fromJson.
  final String publicId;
  final String title;
  final String slug;

  const BookCategory({
    required this.publicId,
    required this.title,
    required this.slug,
  });

  @override
  List<Object?> get props => [publicId, title, slug];
}

class Book extends Equatable {
  final String slug;
  final String title;
  final String author;
  final String? coverImageUrl;
  final BookCategory? category;
  final int priceLt;
  final bool isVipOnly;
  final bool hasPurchased;
  final bool isNewRelease;
  final int chapterCount;
  final String? description;

  const Book({
    required this.slug,
    required this.title,
    required this.author,
    this.coverImageUrl,
    this.category,
    required this.priceLt,
    required this.isVipOnly,
    required this.hasPurchased,
    required this.isNewRelease,
    required this.chapterCount,
    this.description,
  });

  @override
  List<Object?> get props => [slug, title, author];
}

class BookChapterMeta extends Equatable {
  final int order;
  final String title;
  final int pageCount;
  final bool isDemo;
  final bool canAccess;
  final bool isCompleted;
  final bool hasTrainingSet;

  const BookChapterMeta({
    required this.order,
    required this.title,
    required this.pageCount,
    required this.isDemo,
    required this.canAccess,
    required this.isCompleted,
    required this.hasTrainingSet,
  });

  @override
  List<Object?> get props => [order, title];
}

class BookDetail extends Equatable {
  final String slug;
  final String title;
  final String author;
  final String? coverImageUrl;

  /// CDN-optimized WebP copy — prefer this over [coverImageUrl] when
  /// present, same priority as web (`small_cover` → `cover_image`).
  final String? smallCoverUrl;
  final BookCategory? category;
  final int priceLt;
  final bool hasPurchased;
  final bool isNewRelease;

  /// Whether the book itself is free for everyone — distinct from VIP
  /// access, which is a property of the *user* (`UserEntity.isVip`), not
  /// the book. There is deliberately no `isVipOnly` field here: the
  /// backend never sends one (`BookDetailSerializer` has no such field —
  /// VIP-gating is done purely via the logged-in user's `user_type`), and
  /// a prior version of this field always parsed to `false` from a JSON
  /// key that doesn't exist.
  final bool isFree;
  final String? description;
  final List<BookChapterMeta> chapters;
  final int? lastReadChapterOrder;

  const BookDetail({
    required this.slug,
    required this.title,
    required this.author,
    this.coverImageUrl,
    this.smallCoverUrl,
    this.category,
    required this.priceLt,
    required this.hasPurchased,
    required this.isNewRelease,
    this.isFree = false,
    this.description,
    required this.chapters,
    this.lastReadChapterOrder,
  });

  @override
  List<Object?> get props => [slug, title];
}

class BookChapterContent extends Equatable {
  final int order;
  final String title;
  final int pageCount;
  final bool hasTrainingSet;
  final String encryptedFileUrl;
  final String decryptKeyBase64;

  /// The server derives (key, iv) together from chapter id + encryption
  /// version and never writes the iv into the encrypted file itself (see
  /// books/services/pdf_encryption.py) — it only ever travels over the wire
  /// here, alongside the key.
  final String ivBase64;

  const BookChapterContent({
    required this.order,
    required this.title,
    required this.pageCount,
    required this.hasTrainingSet,
    required this.encryptedFileUrl,
    required this.decryptKeyBase64,
    required this.ivBase64,
  });

  @override
  List<Object?> get props => [order, title];
}

class ReadingProgress extends Equatable {
  final String bookSlug;
  final int chapterOrder;
  final int currentPage;
  final DateTime? updatedAt;

  const ReadingProgress({
    required this.bookSlug,
    required this.chapterOrder,
    required this.currentPage,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [bookSlug, chapterOrder, currentPage];
}

class RecentlyReadBook extends Equatable {
  final Book book;
  final int chapterOrder;
  final int currentPage;

  const RecentlyReadBook({
    required this.book,
    required this.chapterOrder,
    required this.currentPage,
  });

  @override
  List<Object?> get props => [book.slug, chapterOrder, currentPage];
}
