import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../domain/entities/book.dart';
import '../../domain/repositories/books_repository.dart';

part 'books_event.dart';
part 'books_state.dart';

@injectable
class BooksBloc extends Bloc<BooksEvent, BooksState> {
  final BooksRepository _repository;

  BooksBloc(this._repository) : super(BooksInitial()) {
    on<LoadBooks>(_onLoadBooks);
    on<FilterBooksCategory>(_onFilterCategory);
    on<SearchBooks>(_onSearch);
  }

  String? _selectedCategory;
  String? _searchQuery;
  List<BookCategory> _categories = [];

  Future<void> _onLoadBooks(
      LoadBooks event, Emitter<BooksState> emit) async {
    emit(BooksLoading());

    final catResult = await _repository.getCategories();
    catResult.fold(
      (f) => null, // categories are optional
      (cats) => _categories = cats,
    );

    final result = await _repository.getBooks(
      category: _selectedCategory,
      search: _searchQuery,
    );

    result.fold(
      (failure) => emit(BooksError(failure.message)),
      (books) => emit(BooksLoaded(
        books: books,
        categories: _categories,
        selectedCategory: _selectedCategory,
      )),
    );
  }

  Future<void> _onFilterCategory(
      FilterBooksCategory event, Emitter<BooksState> emit) async {
    _selectedCategory = event.categorySlug;
    _searchQuery = null;
    add(const LoadBooks());
  }

  Future<void> _onSearch(
      SearchBooks event, Emitter<BooksState> emit) async {
    _searchQuery = event.query.isEmpty ? null : event.query;
    add(const LoadBooks());
  }
}
