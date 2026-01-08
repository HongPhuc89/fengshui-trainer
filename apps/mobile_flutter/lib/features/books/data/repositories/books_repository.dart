import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/book_models.dart';

class BooksRepository {

  BooksRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<List<Book>> getBooks() async {
    final response = await _apiClient.get<List<dynamic>>(ApiEndpoints.books);
    return response
        .map((json) => Book.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<Book> getBookDetail(int bookId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiEndpoints.bookDetail(bookId),
    );
    return Book.fromJson(response);
  }

  Future<List<Chapter>> getBookChapters(int bookId) async {
    final response = await _apiClient.get<List<dynamic>>(
      ApiEndpoints.bookChapters(bookId),
    );
    return response
        .map((json) => Chapter.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<Chapter> getChapterDetail(int bookId, int chapterId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiEndpoints.chapterDetail(bookId, chapterId),
    );
    return Chapter.fromJson(response);
  }
}
