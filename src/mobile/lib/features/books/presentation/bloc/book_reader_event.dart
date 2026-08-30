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

class ChangePage extends BookReaderEvent {
  final int page;
  const ChangePage(this.page);
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
