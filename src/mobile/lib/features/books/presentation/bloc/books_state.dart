part of 'books_bloc.dart';

abstract class BooksState extends Equatable {
  const BooksState();
  @override
  List<Object?> get props => [];
}

class BooksInitial extends BooksState {}

class BooksLoading extends BooksState {}

class BooksLoaded extends BooksState {
  final List<Book> books;
  final List<BookCategory> categories;
  final String? selectedCategory;

  const BooksLoaded({
    required this.books,
    required this.categories,
    this.selectedCategory,
  });

  @override
  List<Object?> get props => [books, categories, selectedCategory];
}

class BooksError extends BooksState {
  final String message;
  const BooksError(this.message);
  @override
  List<Object?> get props => [message];
}
