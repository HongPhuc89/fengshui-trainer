import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';

import '../cache/cache_service.dart';
import '../../features/auth/domain/entities/user.dart';

part 'auth_state.dart';

@singleton
class AuthCubit extends Cubit<AuthState> {
  final FlutterSecureStorage _secureStorage;
  final CacheService _cacheService;

  Timer? _refreshTimer;

  AuthCubit(this._secureStorage, this._cacheService)
      : super(AuthUnauthenticated());

  String? get accessToken {
    final s = state;
    return s is AuthAuthenticated ? s.accessToken : null;
  }

  bool get isAuthenticated => state is AuthAuthenticated;

  UserEntity? get currentUser {
    final s = state;
    return s is AuthAuthenticated ? s.user : null;
  }

  Future<void> setTokens(
    String access,
    String refresh,
    UserEntity user,
  ) async {
    await _secureStorage.write(key: 'access', value: access);
    await _secureStorage.write(key: 'refresh', value: refresh);
    emit(AuthAuthenticated(
      accessToken: access,
      refreshToken: refresh,
      user: user,
    ));
    _startAutoRefresh();
  }

  Future<void> restoreSession() async {
    final access = await _secureStorage.read(key: 'access');
    final refresh = await _secureStorage.read(key: 'refresh');
    if (access != null && refresh != null) {
      // Token exists — mark as potentially authenticated.
      // The API client will refresh on 401 if needed.
      // User profile will be fetched by the app on first API call.
      emit(AuthAuthenticated(
        accessToken: access,
        refreshToken: refresh,
        user: null,
      ));
      _startAutoRefresh();
    }
  }

  Future<bool> doRefresh() async {
    final s = state;
    if (s is! AuthAuthenticated) return false;

    // Actual refresh logic is handled by ApiClient interceptor.
    // This is a stub that returns false to trigger logout.
    // The interceptor calls this, and if it gets false, clears auth.
    return false;
  }

  /// Store a rotated refresh token. The server blacklists the previous one on
  /// every refresh, so keeping the old value would break the next refresh.
  Future<void> updateRefreshToken(String newRefresh) async {
    final s = state;
    if (s is AuthAuthenticated) {
      await _secureStorage.write(key: 'refresh', value: newRefresh);
      emit(AuthAuthenticated(
        accessToken: s.accessToken,
        refreshToken: newRefresh,
        user: s.user,
      ));
    }
  }

  Future<void> updateAccessToken(String newAccess) async {
    final s = state;
    if (s is AuthAuthenticated) {
      await _secureStorage.write(key: 'access', value: newAccess);
      emit(AuthAuthenticated(
        accessToken: newAccess,
        refreshToken: s.refreshToken,
        user: s.user,
      ));
    }
  }

  void updateUser(UserEntity user) {
    final s = state;
    if (s is AuthAuthenticated) {
      emit(AuthAuthenticated(
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: user,
      ));
    }
  }

  void clearAuth() {
    _stopAutoRefresh();
    _cacheService.clearAll();
    _secureStorage.delete(key: 'access');
    _secureStorage.delete(key: 'refresh');
    emit(AuthUnauthenticated());
  }

  // Auto-refresh 5 minutes before expiry (align with web)
  void _startAutoRefresh() {
    _stopAutoRefresh();
    // JWT typically expires in 60 min — refresh after 55 min
    _refreshTimer = Timer.periodic(
      const Duration(minutes: 55),
      (_) => _performRefresh(),
    );
  }

  void _stopAutoRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }

  Future<void> _performRefresh() async {
    final s = state;
    if (s is! AuthAuthenticated) return;

    // This will be implemented by the auth repository
    // For now it's a placeholder — the interceptor handles actual refresh
  }

  @override
  Future<void> close() {
    _stopAutoRefresh();
    return super.close();
  }
}
