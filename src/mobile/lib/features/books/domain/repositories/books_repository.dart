import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/book.dart';

abstract class BooksRepository {
  Future<Either<Failure, List<BookCategory>>> getCategories();
  Future<Either<Failure, List<Book>>> getBooks({
    String? category,
    String? search,
    String? sort,
  });
  Future<Either<Failure, List<RecentlyReadBook>>> getRecentlyRead();
  Future<Either<Failure, BookDetail>> getBookDetail(String slug);
  Future<Either<Failure, BookChapterContent>> getChapter(
      String slug, int order);
  Future<Either<Failure, ReadingProgress?>> getReadingProgress(String slug);
  Future<Either<Failure, void>> saveReadingProgress(
      String slug, int chapterOrder, int page);
  Future<Either<Failure, void>> saveChapterProgress(
      String slug, int chapterOrder, int page);
  Future<Either<Failure, void>> purchaseBook(String slug);
}
