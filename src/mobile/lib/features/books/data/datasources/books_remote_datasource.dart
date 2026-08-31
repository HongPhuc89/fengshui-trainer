import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../models/book_model.dart';

abstract class BooksRemoteDataSource {
  Future<List<BookCategoryModel>> getCategories();
  Future<List<BookModel>> getBooks({
    String? category,
    String? search,
    String? sort,
  });
  Future<List<RecentlyReadBookModel>> getRecentlyRead();
  Future<BookDetailModel> getBookDetail(String slug);
  Future<BookChapterContentModel> getChapter(String slug, int order);
  Future<ReadingProgressModel?> getReadingProgress(String slug);
  Future<void> saveReadingProgress(
      String slug, int chapterOrder, int page);
  Future<void> saveChapterProgress(
      String slug, int chapterOrder, int page);
  Future<void> purchaseBook(String slug);
}

@Injectable(as: BooksRemoteDataSource)
class BooksRemoteDataSourceImpl implements BooksRemoteDataSource {
  final ApiClient _apiClient;

  BooksRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<BookCategoryModel>> getCategories() async {
    try {
      final resp = await _apiClient.get(ApiEndpoints.bookCategories);
      final list = resp.data as List<dynamic>;
      return list
          .map((e) => BookCategoryModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<List<BookModel>> getBooks({
    String? category,
    String? search,
    String? sort,
  }) async {
    try {
      final params = <String, dynamic>{};
      if (category != null) params['category'] = category;
      if (search != null && search.isNotEmpty) params['search'] = search;
      if (sort != null) params['ordering'] = sort;

      final resp = await _apiClient.get(
        ApiEndpoints.books,
        queryParameters: params,
      );

      final data = resp.data;
      final List<dynamic> list =
          data is Map ? (data['results'] as List<dynamic>? ?? []) : data as List<dynamic>;

      return list
          .map((e) => BookModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<List<RecentlyReadBookModel>> getRecentlyRead() async {
    try {
      final resp = await _apiClient.get(ApiEndpoints.recentlyRead);
      final list = resp.data as List<dynamic>;
      return list
          .map((e) => RecentlyReadBookModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<BookDetailModel> getBookDetail(String slug) async {
    try {
      final resp = await _apiClient.get(ApiEndpoints.bookDetail(slug));
      return BookDetailModel.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<BookChapterContentModel> getChapter(String slug, int order) async {
    try {
      final chapterResp =
          await _apiClient.get(ApiEndpoints.chapter(slug, order));
      final keyResp =
          await _apiClient.get(ApiEndpoints.chapterDecryptKey(slug, order));
      return BookChapterContentModel.fromJson(
        chapterResp.data as Map<String, dynamic>,
        keyResp.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<ReadingProgressModel?> getReadingProgress(String slug) async {
    try {
      final resp = await _apiClient.get(ApiEndpoints.bookProgress(slug));
      if (resp.data == null) return null;
      return ReadingProgressModel.fromJson(
          slug, resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw parseDioError(e);
    }
  }

  @override
  Future<void> saveReadingProgress(
      String slug, int chapterOrder, int page) async {
    try {
      await _apiClient.post(ApiEndpoints.bookProgress(slug), data: {
        'chapter_order': chapterOrder,
        'current_page': page,
      });
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<void> saveChapterProgress(
      String slug, int chapterOrder, int page) async {
    try {
      await _apiClient.post(
          ApiEndpoints.chapterProgress(slug, chapterOrder),
          data: {'current_page': page});
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<void> purchaseBook(String slug) async {
    try {
      await _apiClient.post(ApiEndpoints.purchaseBook,
          data: {'book_slug': slug});
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }
}
