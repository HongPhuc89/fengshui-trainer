part of 'book_detail_bloc.dart';

abstract class BookDetailEvent extends Equatable {
  const BookDetailEvent();
  @override
  List<Object?> get props => [];
}

class LoadBookDetail extends BookDetailEvent {
  final String slug;
  const LoadBookDetail(this.slug);
  @override
  List<Object?> get props => [slug];
}

class PurchaseBook extends BookDetailEvent {
  final String slug;
  const PurchaseBook(this.slug);
  @override
  List<Object?> get props => [slug];
}
