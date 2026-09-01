part of 'book_detail_bloc.dart';

abstract class BookDetailState extends Equatable {
  const BookDetailState();
  @override
  List<Object?> get props => [];
}

class BookDetailInitial extends BookDetailState {}

class BookDetailLoading extends BookDetailState {}

class BookDetailLoaded extends BookDetailState {
  final BookDetail detail;

  /// Nullable: a transient failure fetching it must not block showing the
  /// book itself — only the "current chapter" badge/highlight degrades.
  /// Also stays null when the book isn't unlocked yet (see
  /// BookDetailBloc._onLoad) since it's meaningless to ask "where did the
  /// user leave off" for a book they can't read.
  final ReadingProgress? progress;
  const BookDetailLoaded(this.detail, {this.progress});
  @override
  List<Object?> get props => [detail, progress];
}

class BookDetailError extends BookDetailState {
  final String message;
  const BookDetailError(this.message);
  @override
  List<Object?> get props => [message];
}

class BookDetailPurchasing extends BookDetailState {
  final BookDetail detail;
  final ReadingProgress? progress;
  const BookDetailPurchasing(this.detail, {this.progress});
  @override
  List<Object?> get props => [detail, progress];
}

class BookDetailPurchaseError extends BookDetailState {
  final BookDetail detail;
  final String message;
  final ReadingProgress? progress;
  const BookDetailPurchaseError(this.detail, this.message, {this.progress});
  @override
  List<Object?> get props => [detail, message, progress];
}

/// Emitted exactly once, right after a purchase actually completes — the
/// "Mua sách thành công!" toast is tied to this, not to BookDetailLoaded with
/// hasPurchased=true, which is also true every time a book already owned is
/// simply opened or reloaded.
class BookDetailPurchaseSuccess extends BookDetailState {
  final BookDetail detail;
  final ReadingProgress? progress;
  const BookDetailPurchaseSuccess(this.detail, {this.progress});
  @override
  List<Object?> get props => [detail, progress];
}
