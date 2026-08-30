part of 'books_bloc.dart';

abstract class BooksEvent extends Equatable {
  const BooksEvent();
  @override
  List<Object?> get props => [];
}

class LoadBooks extends BooksEvent {
  const LoadBooks();
}

class FilterBooksCategory extends BooksEvent {
  final String? categorySlug;
  const FilterBooksCategory(this.categorySlug);
  @override
  List<Object?> get props => [categorySlug];
}

class SearchBooks extends BooksEvent {
  final String query;
  const SearchBooks(this.query);
  @override
  List<Object?> get props => [query];
}
