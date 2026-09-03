import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:pdfx/pdfx.dart';

import '../../../../core/observability/sentry_log_service.dart';
import '../../../../core/pdf/pdf_decryption_service.dart';
import '../../domain/entities/book.dart';
import '../../domain/repositories/books_repository.dart';

part 'book_reader_event.dart';
part 'book_reader_state.dart';

@injectable
class BookReaderBloc extends Bloc<BookReaderEvent, BookReaderState> {
  final BooksRepository _repository;
  final PdfDecryptionService _pdfDecryption;

  PdfControllerPinch? pdfController;
  Timer? _progressTimer;

  // Fetched once per reader session (first LoadChapter) and reused across
  // chapter changes — same book, no need to re-fetch every time the user
  // crosses a chapter boundary. See _onLoadChapter.
  BookDetail? _bookDetail;

  BookReaderBloc(this._repository, this._pdfDecryption)
    : super(BookReaderInitial()) {
    on<LoadChapter>(_onLoadChapter);
    on<ChangePage>(_onChangePage);
    on<PageScrolled>(_onPageScrolled);
    on<ToggleToc>(_onToggleToc);
    on<AppBackgrounded>(_onAppBackgrounded);
    on<AppForegrounded>(_onAppForegrounded);
  }

  Future<void> _onLoadChapter(
    LoadChapter event,
    Emitter<BookReaderState> emit,
  ) async {
    emit(BookReaderLoading());

    // Both requests kick off immediately (Dart runs sync code up to the
    // first `await` inside each call before returning its Future), so this
    // runs concurrently with getChapter below rather than after it.
    final bookDetailFuture =
        _bookDetail == null ? _repository.getBookDetail(event.bookSlug) : null;

    final result = await _repository.getChapter(
      event.bookSlug,
      event.chapterOrder,
    );

    if (bookDetailFuture != null) {
      final bookDetailResult = await bookDetailFuture;
      // Supplementary data only (TOC + cross-chapter nav) — a failure here
      // must not block reading the chapter PDF itself, so we swallow it and
      // just leave _bookDetail null (TOC/next-chapter button degrade, PDF
      // still renders normally).
      bookDetailResult.fold((_) {}, (detail) => _bookDetail = detail);
    }

    await result.fold(
      (failure) async {
        SentryLogService.trackPdfLoadError(
          event.bookSlug,
          event.chapterOrder,
          failure.message,
        );
        emit(BookReaderError(failure.message));
      },
      (chapter) async {
        try {
          int startPage = event.startPage ?? 1;
          if (event.startPage == null) {
            final progResult = await _repository.getReadingProgress(
              event.bookSlug,
            );
            progResult.fold((_) => null, (prog) {
              if (prog != null && prog.chapterOrder == chapter.order) {
                startPage = prog.currentPage;
              }
            });
          }

          final keyBytes = base64Decode(chapter.decryptKeyBase64);
          final ivBytes = base64Decode(chapter.ivBase64);
          final pdfBytes = await _pdfDecryption.decrypt(
            encryptedCdnUrl: chapter.encryptedFileUrl,
            keyBytes: keyBytes,
            ivBytes: ivBytes,
          );

          pdfController?.dispose();
          pdfController = PdfControllerPinch(
            document: PdfDocument.openData(pdfBytes),
            initialPage: startPage,
          );

          SentryLogService.trackPdfLoad(event.bookSlug, chapter.order);
          emit(
            BookReaderLoaded(
              bookSlug: event.bookSlug,
              bookDetail: _bookDetail,
              chapter: chapter,
              currentPage: startPage,
              totalPages: chapter.pageCount,
              tocVisible: false,
              isBlurred: false,
            ),
          );
        } on DioException {
          // Network-layer failure fetching the encrypted file from the CDN
          // (DNS, connect, timeout) — distinct from a decrypt/format error,
          // which points at a real content problem, not the network.
          SentryLogService.trackPdfLoadError(
            event.bookSlug,
            event.chapterOrder,
            'network error',
          );
          emit(
            const BookReaderError(
              'Không thể tải PDF. Vui lòng kiểm tra kết nối mạng, '
              'thử đổi sang mạng khác (WiFi/4G) hoặc bật VPN rồi thử lại.',
            ),
          );
        } catch (e) {
          SentryLogService.trackPdfLoadError(
            event.bookSlug,
            event.chapterOrder,
            e.toString(),
          );
          emit(BookReaderError('Không thể tải PDF: ${e.toString()}'));
        }
      },
    );
  }

  /// Explicit navigation (slider drag, prev/next-page arrow) — actively
  /// moves the viewer to the target page.
  void _onChangePage(ChangePage event, Emitter<BookReaderState> emit) {
    final s = state;
    if (s is! BookReaderLoaded) return;
    if (event.page == s.currentPage) return;

    _scheduleProgressSave(s.bookSlug, s.chapter.order, event.page, s.totalPages);
    pdfController?.jumpToPage(event.page);
    emit(s.copyWith(currentPage: event.page));
  }

  /// Passive report from the viewer's own onPageChanged as the user
  /// scrolls — must NOT call jumpToPage(), the user is already there and
  /// forcing another jump would fight their in-flight scroll gesture.
  void _onPageScrolled(PageScrolled event, Emitter<BookReaderState> emit) {
    final s = state;
    if (s is! BookReaderLoaded) return;
    if (event.page == s.currentPage) return;

    _scheduleProgressSave(s.bookSlug, s.chapter.order, event.page, s.totalPages);
    emit(s.copyWith(currentPage: event.page));
  }

  void _scheduleProgressSave(
    String bookSlug,
    int chapterOrder,
    int page,
    int totalPages,
  ) {
    _progressTimer?.cancel();
    _progressTimer = Timer(const Duration(seconds: 1), () {
      // Sent unconditionally (not just when true) so scrolling backwards
      // off the last page correctly un-marks a chapter as completed too —
      // matches web's BookReaderView.vue (`completed: currentPage.value >=
      // chapterPageCount.value`, same computation every save).
      final completed = page >= totalPages;
      _repository.saveChapterProgress(
        bookSlug,
        chapterOrder,
        page,
        completed: completed,
      );
      _repository.saveReadingProgress(bookSlug, chapterOrder, page);
    });
  }

  void _onToggleToc(ToggleToc event, Emitter<BookReaderState> emit) {
    final s = state;
    if (s is BookReaderLoaded) {
      emit(s.copyWith(tocVisible: !s.tocVisible));
    }
  }

  void _onAppBackgrounded(
    AppBackgrounded event,
    Emitter<BookReaderState> emit,
  ) {
    final s = state;
    if (s is BookReaderLoaded) emit(s.copyWith(isBlurred: true));
  }

  void _onAppForegrounded(
    AppForegrounded event,
    Emitter<BookReaderState> emit,
  ) {
    final s = state;
    if (s is BookReaderLoaded) emit(s.copyWith(isBlurred: false));
  }

  @override
  Future<void> close() {
    _progressTimer?.cancel();
    pdfController?.dispose();
    return super.close();
  }
}
