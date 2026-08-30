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
  final BookChapterContent chapter;
  final int currentPage;
  final int totalPages;
  final bool tocVisible;
  final bool isBlurred;

  const BookReaderLoaded({
    required this.bookSlug,
    required this.chapter,
    required this.currentPage,
    required this.totalPages,
    required this.tocVisible,
    required this.isBlurred,
  });

  BookReaderLoaded copyWith({
    int? currentPage,
    bool? tocVisible,
    bool? isBlurred,
  }) {
    return BookReaderLoaded(
      bookSlug: bookSlug,
      chapter: chapter,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages,
      tocVisible: tocVisible ?? this.tocVisible,
      isBlurred: isBlurred ?? this.isBlurred,
    );
  }

  @override
  List<Object?> get props =>
      [bookSlug, chapter, currentPage, totalPages, tocVisible, isBlurred];
}

class BookReaderError extends BookReaderState {
  final String message;
  const BookReaderError(this.message);
  @override
  List<Object?> get props => [message];
}

class BookReaderPdfGenerating extends BookReaderState {}
