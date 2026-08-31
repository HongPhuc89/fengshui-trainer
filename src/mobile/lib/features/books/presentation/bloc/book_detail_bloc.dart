import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../domain/entities/book.dart';
import '../../domain/repositories/books_repository.dart';

part 'book_detail_event.dart';
part 'book_detail_state.dart';

@injectable
class BookDetailBloc extends Bloc<BookDetailEvent, BookDetailState> {
  final BooksRepository _repository;

  BookDetailBloc(this._repository) : super(BookDetailInitial()) {
    on<LoadBookDetail>(_onLoad);
    on<PurchaseBook>(_onPurchase);
  }

  Future<void> _onLoad(
    LoadBookDetail event,
    Emitter<BookDetailState> emit,
  ) async {
    emit(BookDetailLoading());
    final result = await _repository.getBookDetail(
      event.slug,
      forceRefresh: event.forceRefresh,
    );
    result.fold(
      (failure) => emit(BookDetailError(failure.message)),
      (detail) => emit(BookDetailLoaded(detail)),
    );
  }

  Future<void> _onPurchase(
    PurchaseBook event,
    Emitter<BookDetailState> emit,
  ) async {
    final current = state;
    if (current is! BookDetailLoaded) return;

    emit(BookDetailPurchasing(current.detail));
    final result = await _repository.purchaseBook(event.slug);
    await result.fold(
      (failure) async =>
          emit(BookDetailPurchaseError(current.detail, failure.message)),
      (_) async {
        // Fetched directly (not via add(LoadBookDetail(...))) so this handler
        // can emit a dedicated "just purchased" state instead of the plain
        // BookDetailLoaded a later reload would produce — that state is
        // indistinguishable from "opened a book already owned" and was
        // firing the success toast on every load, not just a real purchase.
        final detailResult = await _repository.getBookDetail(
          event.slug,
          forceRefresh: true,
        );
        detailResult.fold(
          (failure) => emit(BookDetailError(failure.message)),
          (detail) => emit(BookDetailPurchaseSuccess(detail)),
        );
      },
    );
  }
}
