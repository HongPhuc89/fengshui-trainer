import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../auth/auth_cubit.dart';
import '../error/exceptions.dart';
import '../utils/constants.dart';

@singleton
class ApiClient {
  late final Dio _dio;
  final AuthCubit _authCubit;

  ApiClient(this._authCubit) {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: _onRequest,
      onError: _onError,
    ));
  }

  Dio get dio => _dio;

  void _onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _authCubit.accessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<void> _onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    if (error.response?.statusCode == 401) {
      final s = _authCubit.state;
      if (s is AuthAuthenticated && s.refreshToken.isNotEmpty) {
        try {
          final refreshDio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl));
          final resp = await refreshDio.post(
            '/auth/refresh/',
            data: {'refresh': s.refreshToken},
          );
          final newAccess = resp.data['access'] as String;
          // Rotation is on server-side, so the refresh token we just sent is now
          // blacklisted; the new one has to replace it or the next refresh fails.
          final newRefresh = resp.data['refresh'] as String?;

          await _authCubit.updateAccessToken(newAccess);
          if (newRefresh != null) {
            await _authCubit.updateRefreshToken(newRefresh);
          }

          // Retry original request with new token
          error.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
          handler.resolve(await _dio.fetch(error.requestOptions));
          return;
        } catch (_) {
          _authCubit.clearAuth();
        }
      } else {
        _authCubit.clearAuth();
      }
    }

    handler.next(error);
  }

  // Convenience methods
  Future<Response<T>> get<T>(String path,
          {Map<String, dynamic>? queryParameters, Options? options}) =>
      _dio.get<T>(path,
          queryParameters: queryParameters, options: options);

  Future<Response<T>> post<T>(String path,
          {dynamic data, Options? options}) =>
      _dio.post<T>(path, data: data, options: options);

  Future<Response<T>> put<T>(String path,
          {dynamic data, Options? options}) =>
      _dio.put<T>(path, data: data, options: options);

  Future<Response<T>> patch<T>(String path,
          {dynamic data, Options? options}) =>
      _dio.patch<T>(path, data: data, options: options);
}

// Helper to parse Dio errors into app exceptions
ServerException parseDioError(DioException e) {
  final statusCode = e.response?.statusCode;
  final data = e.response?.data;

  if (statusCode == 400 && data is Map) {
    final code = data['code'];
    if (code == 'PAIRING_CODE_REQUIRED') {
      throw PairingRequiredException(
        hasUnclaimedSlot: data['has_unclaimed_slot'] == true,
        supportEmail: data['support_email'] as String?,
      );
    }
    // Wrong, expired or already-spent code. The detail carries the attempts left.
    if (code == 'PAIRING_FAILED') {
      throw PairingFailedException(
        (data['detail'] ?? 'Mã ghép cặp không hợp lệ').toString(),
      );
    }
  }

  if (statusCode == 202) {
    throw const PdfGeneratingException();
  }

  final message = _extractMessage(data) ?? 'Lỗi không xác định';
  return ServerException(message, statusCode: statusCode);
}

String? _extractMessage(dynamic data) {
  if (data is Map) {
    return (data['detail'] ?? data['message'] ?? data['error'])?.toString();
  }
  return null;
}
