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
  const BookDetailLoaded(this.detail);
  @override
  List<Object?> get props => [detail];
}

class BookDetailError extends BookDetailState {
  final String message;
  const BookDetailError(this.message);
  @override
  List<Object?> get props => [message];
}

class BookDetailPurchasing extends BookDetailState {
  final BookDetail detail;
  const BookDetailPurchasing(this.detail);
  @override
  List<Object?> get props => [detail];
}

class BookDetailPurchaseError extends BookDetailState {
  final BookDetail detail;
  final String message;
  const BookDetailPurchaseError(this.detail, this.message);
  @override
  List<Object?> get props => [detail, message];
}

/// Emitted exactly once, right after a purchase actually completes — the
/// "Mua sách thành công!" toast is tied to this, not to BookDetailLoaded with
/// hasPurchased=true, which is also true every time a book already owned is
/// simply opened or reloaded.
class BookDetailPurchaseSuccess extends BookDetailState {
  final BookDetail detail;
  const BookDetailPurchaseSuccess(this.detail);
  @override
  List<Object?> get props => [detail];
}
