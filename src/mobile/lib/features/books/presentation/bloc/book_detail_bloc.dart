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
      LoadBookDetail event, Emitter<BookDetailState> emit) async {
    emit(BookDetailLoading());
    final result = await _repository.getBookDetail(event.slug);
    result.fold(
      (failure) => emit(BookDetailError(failure.message)),
      (detail) => emit(BookDetailLoaded(detail)),
    );
  }

  Future<void> _onPurchase(
      PurchaseBook event, Emitter<BookDetailState> emit) async {
    final current = state;
    if (current is! BookDetailLoaded) return;

    emit(BookDetailPurchasing(current.detail));
    final result = await _repository.purchaseBook(event.slug);
    result.fold(
      (failure) => emit(BookDetailPurchaseError(current.detail, failure.message)),
      (_) {
        // Reload detail after purchase to update hasPurchased flag
        add(LoadBookDetail(event.slug));
      },
    );
  }
}
