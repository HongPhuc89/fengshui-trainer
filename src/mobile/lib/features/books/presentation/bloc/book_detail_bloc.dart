import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/auth/auth_cubit.dart';
import '../../domain/entities/book.dart';
import '../../domain/repositories/books_repository.dart';

part 'book_detail_event.dart';
part 'book_detail_state.dart';

@injectable
class BookDetailBloc extends Bloc<BookDetailEvent, BookDetailState> {
  final BooksRepository _repository;
  final AuthCubit _authCubit;

  BookDetailBloc(this._repository, this._authCubit)
    : super(BookDetailInitial()) {
    on<LoadBookDetail>(_onLoad);
    on<PurchaseBook>(_onPurchase);
  }

  /// VIP is a property of the logged-in *user* (`user_type`), never of the
  /// book — mirrors web's `authStore.user?.user_type === 'VIP'`. There is
  /// no `BookDetail.isVipOnly` to check here on purpose (see book.dart).
  bool get _isVip {
    final authState = _authCubit.state;
    return authState is AuthAuthenticated && (authState.user?.isVip ?? false);
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
    await result.fold(
      (failure) async => emit(BookDetailError(failure.message)),
      (detail) async {
        emit(BookDetailLoaded(detail, progress: await _fetchProgress(detail)));
      },
    );
  }

  /// Only fetched once the book is actually unlocked (free | VIP |
  /// purchased) — mirrors web, which never calls the progress endpoint for
  /// a book the user can't read yet. A failure here degrades gracefully:
  /// no current-chapter badge/highlight, book still opens fine.
  Future<ReadingProgress?> _fetchProgress(BookDetail detail) async {
    if (!(detail.isFree || _isVip || detail.hasPurchased)) return null;
    final result = await _repository.getReadingProgress(detail.slug);
    return result.fold((_) => null, (p) => p);
  }

  Future<void> _onPurchase(
    PurchaseBook event,
    Emitter<BookDetailState> emit,
  ) async {
    final current = state;
    if (current is! BookDetailLoaded) return;

    // Carry the existing progress forward instead of dropping it — purchase
    // doesn't change it, and re-emitting without it would flicker the
    // current-chapter badge off then back on once the reload below finishes.
    emit(BookDetailPurchasing(current.detail, progress: current.progress));
    final result = await _repository.purchaseBook(event.slug);
    await result.fold(
      (failure) async => emit(
        BookDetailPurchaseError(
          current.detail,
          failure.message,
          progress: current.progress,
        ),
      ),
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
        await detailResult.fold(
          (failure) async => emit(BookDetailError(failure.message)),
          (detail) async => emit(
            BookDetailPurchaseSuccess(
              detail,
              progress: await _fetchProgress(detail),
            ),
          ),
        );
      },
    );
  }
}
