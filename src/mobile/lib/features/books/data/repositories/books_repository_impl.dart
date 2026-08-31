import 'package:flutter/foundation.dart';
import 'dart:convert';

import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/cache/cache_service.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/constants.dart';
import '../../domain/entities/book.dart';
import '../../domain/repositories/books_repository.dart';
import '../datasources/books_remote_datasource.dart';
import '../models/book_model.dart';

@Injectable(as: BooksRepository)
class BooksRepositoryImpl implements BooksRepository {
  final BooksRemoteDataSource _remote;
  final CacheService _cache;

  BooksRepositoryImpl(this._remote, this._cache);

  @override
  Future<Either<Failure, List<BookCategory>>> getCategories() async {
    try {
      final cacheKey = CacheKeys.bookCategories;
      final cached = await _cache.get<List<dynamic>>(cacheKey);
      if (cached != null) {
        return Right(cached
            .map((e) =>
                BookCategoryModel.fromJson(e as Map<String, dynamic>))
            .toList());
      }

      final data = await _remote.getCategories();
      await _cache.set(
        cacheKey,
        data.map((c) => {'public_id': c.publicId, 'title': c.title, 'slug': c.slug}).toList(),
        CacheTtl.categories,
      );
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, List<Book>>> getBooks({
    String? category,
    String? search,
    String? sort,
  }) async {
    try {
      final cacheKey = CacheKeys.books(category: category, search: search);
      final cached = await _cache.get<List<dynamic>>(cacheKey);
      if (cached != null && search == null) {
        // Don't cache search results for long
        return Right(cached
            .map((e) => BookModel.fromJson(e as Map<String, dynamic>))
            .toList());
      }

      final data = await _remote.getBooks(
          category: category, search: search, sort: sort);
      if (search == null) {
        await _cache.set(
          cacheKey,
          jsonDecode(jsonEncode(data.map((b) => _bookToJson(b)).toList())),
          CacheTtl.list,
        );
      }
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, List<RecentlyReadBook>>> getRecentlyRead() async {
    try {
      final cacheKey = CacheKeys.recentlyRead;
      final cached = await _cache.get<List<dynamic>>(cacheKey);
      if (cached != null) {
        return Right(cached
            .map((e) =>
                RecentlyReadBookModel.fromJson(e as Map<String, dynamic>))
            .toList());
      }

      final data = await _remote.getRecentlyRead();
      await _cache.set(
        cacheKey,
        jsonDecode(jsonEncode(data
            .map((r) => {
                  'book': _bookToJson(r.book),
                  'chapter_order': r.chapterOrder,
                  'current_page': r.currentPage,
                })
            .toList())),
        CacheTtl.recentlyX,
      );
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, BookDetail>> getBookDetail(String slug) async {
    try {
      final cacheKey = CacheKeys.bookDetail(slug);
      final cached = await _cache.get<Map<String, dynamic>>(cacheKey);
      if (cached != null) {
        return Right(BookDetailModel.fromJson(cached));
      }

      final data = await _remote.getBookDetail(slug);
      await _cache.set(cacheKey, _bookDetailToJson(data), CacheTtl.list);
      return Right(data);
    } on ServerException catch (e) {
      if (e.statusCode == 404) return const Left(NotFoundFailure());
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, BookChapterContent>> getChapter(
      String slug, int order) async {
    // No cache for DRM content
    try {
      final data = await _remote.getChapter(slug, order);
      return Right(data);
    } on PdfGeneratingException {
      return const Left(PdfGeneratingFailure());
    } on ServerException catch (e) {
      if (e.statusCode == 403) return const Left(ForbiddenFailure());
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ReadingProgress?>> getReadingProgress(
      String slug) async {
    // No cache for progress
    try {
      final data = await _remote.getReadingProgress(slug);
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> saveReadingProgress(
      String slug, int chapterOrder, int page) async {
    try {
      await _remote.saveReadingProgress(slug, chapterOrder, page);
      // Invalidate recently-read cache
      await _cache.delete(CacheKeys.recentlyRead);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> saveChapterProgress(
      String slug, int chapterOrder, int page) async {
    try {
      await _remote.saveChapterProgress(slug, chapterOrder, page);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> purchaseBook(String slug) async {
    try {
      await _remote.purchaseBook(slug);
      // Invalidate book detail cache after purchase
      await _cache.delete(CacheKeys.bookDetail(slug));
      return const Right(null);
    } on ServerException catch (e) {
      if (e.statusCode == 403) {
        return const Left(ForbiddenFailure('Số dư không đủ'));
      }
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  Map<String, dynamic> _bookToJson(Book b) => {
        'slug': b.slug,
        'title': b.title,
        'author': b.author,
        'cover_image': b.coverImageUrl,
        'category': b.category != null
            ? {'public_id': b.category!.publicId, 'title': b.category!.title, 'slug': b.category!.slug}
            : null,
        'price_lt': b.priceLt,
        'is_vip_only': b.isVipOnly,
        'has_purchased': b.hasPurchased,
        'is_new_release': b.isNewRelease,
        'chapter_count': b.chapterCount,
        'description': b.description,
      };

  Map<String, dynamic> _bookDetailToJson(BookDetail b) => {
        'slug': b.slug,
        'title': b.title,
        'author': b.author,
        'cover_image': b.coverImageUrl,
        'category': b.category != null
            ? {'public_id': b.category!.publicId, 'title': b.category!.title, 'slug': b.category!.slug}
            : null,
        'price_lt': b.priceLt,
        'is_vip_only': b.isVipOnly,
        'has_purchased': b.hasPurchased,
        'is_new_release': b.isNewRelease,
        'description': b.description,
        'chapters': b.chapters
            .map((c) => {
                  'order': c.order,
                  'title': c.title,
                  'page_count': c.pageCount,
                  'is_demo': c.isDemo,
                  'can_access': c.canAccess,
                  'is_completed': c.isCompleted,
                  'has_training_set': c.hasTrainingSet,
                })
            .toList(),
        if (b.lastReadChapterOrder != null)
          'reading_progress': {'chapter_order': b.lastReadChapterOrder},
      };
}
