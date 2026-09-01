part of 'book_detail_bloc.dart';

abstract class BookDetailEvent extends Equatable {
  const BookDetailEvent();
  @override
  List<Object?> get props => [];
}

class LoadBookDetail extends BookDetailEvent {
  final String slug;
  final bool forceRefresh;
  const LoadBookDetail(this.slug, {this.forceRefresh = false});
  @override
  List<Object?> get props => [slug, forceRefresh];
}

class PurchaseBook extends BookDetailEvent {
  final String slug;
  const PurchaseBook(this.slug);
  @override
  List<Object?> get props => [slug];
}
