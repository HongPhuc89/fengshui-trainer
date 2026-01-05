import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import '../config/environment.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  late final Dio _dio;
  final SecureStorage _storage;
  final Logger _logger = Logger();

  ApiClient(this._storage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: Environment.apiBaseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add auth token
          final token = await _storage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          _logger.d('🔑 API Request: ${options.method} ${options.path}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          _logger.d('✅ API Response: ${response.statusCode} ${response.requestOptions.path}');
          return handler.next(response);
        },
        onError: (error, handler) async {
          _logger.e('❌ API Error: ${error.response?.statusCode} ${error.requestOptions.path}');

          // Handle 401 - try to refresh token
          if (error.response?.statusCode == 401) {
            try {
              final refreshed = await _refreshToken();
              if (refreshed) {
                // Retry original request
                final opts = error.requestOptions;
                final token = await _storage.getToken();
                opts.headers['Authorization'] = 'Bearer $token';
                
                final response = await _dio.fetch(opts);
                return handler.resolve(response);
              }
            } catch (e) {
              _logger.e('Failed to refresh token: $e');
            }
          }

          return handler.next(error);
        },
      ),
    );
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null) return false;

      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      final newToken = response.data['accessToken'];
      final newRefreshToken = response.data['refreshToken'];

      await _storage.saveToken(newToken);
      await _storage.saveRefreshToken(newRefreshToken);

      return true;
    } catch (e) {
      return false;
    }
  }

  // HTTP Methods
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = await _dio.get(path, queryParameters: queryParameters);
    return response.data as T;
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = await _dio.post(
      path,
      data: data,
      queryParameters: queryParameters,
    );
    return response.data as T;
  }

  Future<T> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = await _dio.put(
      path,
      data: data,
      queryParameters: queryParameters,
    );
    return response.data as T;
  }

  Future<T> delete<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = await _dio.delete(path, queryParameters: queryParameters);
    return response.data as T;
  }
}
