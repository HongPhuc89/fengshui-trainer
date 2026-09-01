part of 'book_reader_bloc.dart';

abstract class BookReaderState extends Equatable {
  const BookReaderState();
  @override
  List<Object?> get props => [];
}

class BookReaderInitial extends BookReaderState {}

class BookReaderLoading extends BookReaderState {}

class BookReaderLoaded extends BookReaderState {
  final String bookSlug;

  /// Full book (incl. chapter TOC) — fetched once per reader session and
  /// carried across chapter changes. Nullable: a transient failure fetching
  /// it must not block reading the chapter PDF itself, only degrade the TOC
  /// and cross-chapter navigation (see book_reader_bloc._onLoadChapter).
  final BookDetail? bookDetail;
  final BookChapterContent chapter;
  final int currentPage;
  final int totalPages;
  final bool tocVisible;
  final bool isBlurred;

  const BookReaderLoaded({
    required this.bookSlug,
    required this.bookDetail,
    required this.chapter,
    required this.currentPage,
    required this.totalPages,
    required this.tocVisible,
    required this.isBlurred,
  });

  bool get isFirstPageOfChapter => currentPage <= 1;
  bool get isLastPageOfChapter => currentPage >= totalPages;

  /// Nearest chapter by `order` on either side of the current one — NOT
  /// `order ± 1` / array length, since `BookChapter.order` only guarantees
  /// uniqueness per book (unique_together), not a contiguous 1..N sequence.
  ///
  /// Written as a manual loop rather than `Iterable.reduce()`: `chapters`'
  /// reified runtime type is `List<BookChapterMetaModel>` (the data-layer
  /// subclass, upcast into this `List<BookChapterMeta>`-typed field), and a
  /// `reduce` closure typed against the base `BookChapterMeta` fails Dart's
  /// runtime subtype check against that reified `BookChapterMetaModel` — a
  /// plain loop has no such closure-type mismatch to trip over.
  BookChapterMeta? get _nextChapterMeta {
    final chapters = bookDetail?.chapters;
    if (chapters == null) return null;
    BookChapterMeta? nearest;
    for (final c in chapters) {
      if (c.order > chapter.order && (nearest == null || c.order < nearest.order)) {
        nearest = c;
      }
    }
    return nearest;
  }

  BookChapterMeta? get _prevChapterMeta {
    final chapters = bookDetail?.chapters;
    if (chapters == null) return null;
    BookChapterMeta? nearest;
    for (final c in chapters) {
      if (c.order < chapter.order && (nearest == null || c.order > nearest.order)) {
        nearest = c;
      }
    }
    return nearest;
  }

  int? get nextChapterOrder => _nextChapterMeta?.order;
  int? get prevChapterOrder => _prevChapterMeta?.order;

  /// Target page when navigating to the previous chapter — its last page,
  /// so the reader lands where it would if the user had scrolled backwards.
  int get prevChapterLastPage => _prevChapterMeta?.pageCount ?? 1;

  BookReaderLoaded copyWith({
    BookDetail? bookDetail,
    int? currentPage,
    bool? tocVisible,
    bool? isBlurred,
  }) {
    return BookReaderLoaded(
      bookSlug: bookSlug,
      bookDetail: bookDetail ?? this.bookDetail,
      chapter: chapter,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages,
      tocVisible: tocVisible ?? this.tocVisible,
      isBlurred: isBlurred ?? this.isBlurred,
    );
  }

  @override
  List<Object?> get props => [
        bookSlug,
        bookDetail,
        chapter,
        currentPage,
        totalPages,
        tocVisible,
        isBlurred,
      ];
}

class BookReaderError extends BookReaderState {
  final String message;
  const BookReaderError(this.message);
  @override
  List<Object?> get props => [message];
}

class BookReaderPdfGenerating extends BookReaderState {}
