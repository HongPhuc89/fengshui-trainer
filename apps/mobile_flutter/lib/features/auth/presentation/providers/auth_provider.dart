import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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

  AuthState({
    this.user,
    this.isLoading = false,
    this.error,
    this.isAuthenticated = false,
  });
  final User? user;
  final bool isLoading;
  final String? error;
  final bool isAuthenticated;

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

  AuthNotifier(this._repository) : super(AuthState()) {
    if (kDebugMode) {
      print('🔧 AuthNotifier initialized, checking auth status...');
    }
    _checkAuthStatus();
  }
  final AuthRepository _repository;

  Future<void> _checkAuthStatus() async {
    if (kDebugMode) {
      print('🔍 Checking auth status...');
    }
    
    final isLoggedIn = await _repository.isLoggedIn();
    if (kDebugMode) {
      print('🔍 Token exists in storage: $isLoggedIn');
    }
    
    if (isLoggedIn) {
      try {
        if (kDebugMode) {
          print('📡 Fetching current user from API...');
        }
        
        // Load user data from API
        final user = await _repository.getCurrentUser();
        
        if (kDebugMode) {
          print('✅ User loaded successfully: ${user.email}');
        }
        
        state = state.copyWith(
          user: user,
          isAuthenticated: true,
        );
        
        if (kDebugMode) {
          print('✅ Auth state updated: isAuthenticated=true, user=${user.email}');
        }
      } catch (e) {
        if (kDebugMode) {
          print('❌ Failed to load user: $e');
        }
        
        // If token is invalid or expired, clear it
        await _repository.logout();
        state = AuthState();
        
        if (kDebugMode) {
          print('🗑️ Cleared invalid token, reset to logged out state');
        }
      }
    } else {
      if (kDebugMode) {
        print('ℹ️ No token found, user needs to login');
      }
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true);

    try {
      final request = LoginRequest(email: email, password: password);
      final response = await _repository.login(request);

      state = state.copyWith(
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      );
      
      if (kDebugMode) {
        print('✅ Login successful: ${response.user.email}');
      }
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
    state = state.copyWith(isLoading: true);

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
