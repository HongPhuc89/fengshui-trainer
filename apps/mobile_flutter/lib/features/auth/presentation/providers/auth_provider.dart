import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../data/models/auth_models.dart';
import '../../data/repositories/auth_repository.dart';

// Providers
final secureStorageProvider = Provider<SecureStorage>((ref) {
  return SecureStorage();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return ApiClient(storage);
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthRepository(apiClient, storage);
});

// Auth State
class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;
  final bool isAuthenticated;

  AuthState({
    this.user,
    this.isLoading = false,
    this.error,
    this.isAuthenticated = false,
  });

  AuthState copyWith({
    User? user,
    bool? isLoading,
    String? error,
    bool? isAuthenticated,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }
}

// Auth Notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(AuthState()) {
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    final isLoggedIn = await _repository.isLoggedIn();
    if (isLoggedIn) {
      // Just mark as authenticated, user will be loaded from login response
      state = state.copyWith(
        isAuthenticated: true,
      );
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final request = LoginRequest(email: email, password: password);
      final response = await _repository.login(request);

      state = state.copyWith(
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      );
    } on DioException catch (e) {
      String errorMessage = 'Đăng nhập thất bại';
      
      if (e.response != null) {
        final data = e.response!.data;
        if (data is Map && data.containsKey('message')) {
          errorMessage = data['message'] as String;
        } else if (e.response!.statusCode == 400) {
          errorMessage = 'Email hoặc mật khẩu không đúng';
        } else if (e.response!.statusCode == 401) {
          errorMessage = 'Email hoặc mật khẩu không đúng';
        }
      } else if (e.type == DioExceptionType.connectionTimeout) {
        errorMessage = 'Không thể kết nối đến server';
      } else if (e.type == DioExceptionType.receiveTimeout) {
        errorMessage = 'Server không phản hồi';
      }

      state = state.copyWith(
        isLoading: false,
        error: errorMessage,
      );
      throw Exception(errorMessage);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      rethrow;
    }
  }

  Future<void> register(String email, String password, String name) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final request = RegisterRequest(
        email: email,
        password: password,
        name: name,
      );
      final response = await _repository.register(request);

      state = state.copyWith(
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      );
    } on DioException catch (e) {
      String errorMessage = 'Đăng ký thất bại';
      
      if (e.response != null) {
        final data = e.response!.data;
        if (data is Map && data.containsKey('message')) {
          errorMessage = data['message'] as String;
        } else if (e.response!.statusCode == 400) {
          errorMessage = 'Email đã tồn tại hoặc thông tin không hợp lệ';
        }
      }

      state = state.copyWith(
        isLoading: false,
        error: errorMessage,
      );
      throw Exception(errorMessage);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      rethrow;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = AuthState();
  }
}

// Auth Provider
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthNotifier(repository);
});
