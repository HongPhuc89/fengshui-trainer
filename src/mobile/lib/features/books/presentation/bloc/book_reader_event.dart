part of 'book_reader_bloc.dart';

abstract class BookReaderEvent extends Equatable {
  const BookReaderEvent();
  @override
  List<Object?> get props => [];
}

class LoadChapter extends BookReaderEvent {
  final String bookSlug;
  final int chapterOrder;
  final int? startPage;

  const LoadChapter({
    required this.bookSlug,
    required this.chapterOrder,
    this.startPage,
  });

  @override
  List<Object?> get props => [bookSlug, chapterOrder, startPage];
}

/// Explicit page navigation (slider drag, prev/next-page arrow) — jumps the
/// PDF viewer to [page] via [PdfControllerPinch.jumpToPage].
class ChangePage extends BookReaderEvent {
  final int page;
  const ChangePage(this.page);
  @override
  List<Object?> get props => [page];
}

/// Passive report from [PdfViewPinch.onPageChanged] as the user scrolls —
/// updates state/progress-save only. Must NOT trigger jumpToPage(), or it
/// would fight the user's in-flight scroll gesture.
class PageScrolled extends BookReaderEvent {
  final int page;
  const PageScrolled(this.page);
  @override
  List<Object?> get props => [page];
}

class ToggleToc extends BookReaderEvent {
  const ToggleToc();
}

class AppBackgrounded extends BookReaderEvent {
  const AppBackgrounded();
}

class AppForegrounded extends BookReaderEvent {
  const AppForegrounded();
}
