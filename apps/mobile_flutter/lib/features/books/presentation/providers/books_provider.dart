import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/models/book_models.dart';
import '../../data/repositories/books_repository.dart';

// Repository Provider
final booksRepositoryProvider = Provider<BooksRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return BooksRepository(apiClient);
});

// Books List State
class BooksState {

  BooksState({
    this.books = const [],
    this.isLoading = false,
    this.error,
  });
  final List<Book> books;
  final bool isLoading;
  final String? error;

  BooksState copyWith({
    List<Book>? books,
    bool? isLoading,
    String? error,
  }) {
    return BooksState(
      books: books ?? this.books,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// Books Notifier
class BooksNotifier extends StateNotifier<BooksState> {

  BooksNotifier(this._repository) : super(BooksState()) {
    loadBooks();
  }
  final BooksRepository _repository;

  Future<void> loadBooks() async {
    state = state.copyWith(isLoading: true);

    try {
      final books = await _repository.getBooks();
      state = state.copyWith(books: books, isLoading: false);
    } on DioException catch (e) {
      String errorMessage = 'Không thể tải danh sách sách';
      if (e.response?.statusCode == 401) {
        errorMessage = 'Phiên đăng nhập hết hạn';
      }
      state = state.copyWith(isLoading: false, error: errorMessage);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

// Books Provider
final booksProvider = StateNotifierProvider<BooksNotifier, BooksState>((ref) {
  final repository = ref.watch(booksRepositoryProvider);
  return BooksNotifier(repository);
});

// Chapters State
class ChaptersState {

  ChaptersState({
    this.chapters = const [],
    this.isLoading = false,
    this.error,
  });
  final List<Chapter> chapters;
  final bool isLoading;
  final String? error;

  ChaptersState copyWith({
    List<Chapter>? chapters,
    bool? isLoading,
    String? error,
  }) {
    return ChaptersState(
      chapters: chapters ?? this.chapters,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// Chapters Notifier
class ChaptersNotifier extends StateNotifier<ChaptersState> {

  ChaptersNotifier(this._repository, this.bookId) : super(ChaptersState()) {
    loadChapters();
  }
  final BooksRepository _repository;
  final int bookId;

  Future<void> loadChapters() async {
    state = state.copyWith(isLoading: true);

    try {
      final chapters = await _repository.getBookChapters(bookId);
      state = state.copyWith(chapters: chapters, isLoading: false);
    } on DioException {
      const String errorMessage = 'Không thể tải danh sách chương';
      state = state.copyWith(isLoading: false, error: errorMessage);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

// Chapters Provider Family
final chaptersProvider =
    StateNotifierProvider.family<ChaptersNotifier, ChaptersState, int>(
        (ref, bookId) {
  final repository = ref.watch(booksRepositoryProvider);
  return ChaptersNotifier(repository, bookId);
});
