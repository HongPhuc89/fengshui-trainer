import 'dart:async';
import 'dart:convert';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:pdfx/pdfx.dart';

import '../../../../core/pdf/pdf_decryption_service.dart';
import '../../domain/entities/book.dart';
import '../../domain/repositories/books_repository.dart';

part 'book_reader_event.dart';
part 'book_reader_state.dart';

@injectable
class BookReaderBloc extends Bloc<BookReaderEvent, BookReaderState> {
  final BooksRepository _repository;
  final PdfDecryptionService _pdfDecryption;

  PdfController? pdfController;
  Timer? _progressTimer;

  BookReaderBloc(this._repository, this._pdfDecryption)
      : super(BookReaderInitial()) {
    on<LoadChapter>(_onLoadChapter);
    on<ChangePage>(_onChangePage);
    on<ToggleToc>(_onToggleToc);
    on<AppBackgrounded>(_onAppBackgrounded);
    on<AppForegrounded>(_onAppForegrounded);
  }

  Future<void> _onLoadChapter(
      LoadChapter event, Emitter<BookReaderState> emit) async {
    emit(BookReaderLoading());

    final result =
        await _repository.getChapter(event.bookSlug, event.chapterOrder);
    await result.fold(
      (failure) async => emit(BookReaderError(failure.message)),
      (chapter) async {
        try {
          int startPage = event.startPage ?? 1;
          if (event.startPage == null) {
            final progResult =
                await _repository.getReadingProgress(event.bookSlug);
            progResult.fold(
              (_) => null,
              (prog) {
                if (prog != null && prog.chapterOrder == chapter.order) {
                  startPage = prog.currentPage;
                }
              },
            );
          }

          final keyBytes = base64Decode(chapter.decryptKeyBase64);
          final pdfBytes = await _pdfDecryption.decrypt(
            encryptedCdnUrl: chapter.encryptedFileUrl,
            keyBytes: keyBytes,
          );

          pdfController?.dispose();
          pdfController = PdfController(
            document: PdfDocument.openData(pdfBytes),
            initialPage: startPage,
          );

          emit(BookReaderLoaded(
            bookSlug: event.bookSlug,
            chapter: chapter,
            currentPage: startPage,
            totalPages: chapter.pageCount,
            tocVisible: false,
            isBlurred: false,
          ));
        } catch (e) {
          emit(BookReaderError('Không thể tải PDF: ${e.toString()}'));
        }
      },
    );
  }

  void _onChangePage(ChangePage event, Emitter<BookReaderState> emit) {
    final s = state;
    if (s is! BookReaderLoaded) return;

    _progressTimer?.cancel();
    _progressTimer = Timer(const Duration(seconds: 1), () {
      _repository.saveChapterProgress(s.bookSlug, s.chapter.order, event.page);
      _repository.saveReadingProgress(s.bookSlug, s.chapter.order, event.page);
    });

    pdfController?.jumpToPage(event.page);
    emit(s.copyWith(currentPage: event.page));
  }

  void _onToggleToc(ToggleToc event, Emitter<BookReaderState> emit) {
    final s = state;
    if (s is BookReaderLoaded) {
      emit(s.copyWith(tocVisible: !s.tocVisible));
    }
  }

  void _onAppBackgrounded(
      AppBackgrounded event, Emitter<BookReaderState> emit) {
    final s = state;
    if (s is BookReaderLoaded) emit(s.copyWith(isBlurred: true));
  }

  void _onAppForegrounded(
      AppForegrounded event, Emitter<BookReaderState> emit) {
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
