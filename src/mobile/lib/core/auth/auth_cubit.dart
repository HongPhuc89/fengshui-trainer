import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';

import '../cache/cache_service.dart';
import '../di/injection.dart';
import '../../features/auth/data/datasources/auth_remote_datasource.dart';
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

  Future<void> setTokens(String access, String refresh, UserEntity user) async {
    await _secureStorage.write(key: 'access', value: access);
    await _secureStorage.write(key: 'refresh', value: refresh);
    emit(
      AuthAuthenticated(accessToken: access, refreshToken: refresh, user: user),
    );
    _startAutoRefresh();
  }

  Future<void> restoreSession() async {
    final access = await _secureStorage.read(key: 'access');
    final refresh = await _secureStorage.read(key: 'refresh');
    if (access != null && refresh != null) {
      // Token exists — mark as potentially authenticated right away so the
      // rest of the app isn't blocked on the network. The API client will
      // refresh on 401 if needed.
      emit(
        AuthAuthenticated(
          accessToken: access,
          refreshToken: refresh,
          user: null,
        ),
      );
      _startAutoRefresh();
      unawaited(_fetchProfile());
    }
  }

  /// Fills in `user` (name/phone/email — e.g. for the book/video reader
  /// watermark) after a cold start. Resolved lazily via `getIt` rather than
  /// constructor injection: AuthRemoteDataSource depends on ApiClient, which
  /// itself depends on AuthCubit, so taking it as a constructor dependency
  /// here would be circular.
  Future<void> _fetchProfile() async {
    try {
      final user = await getIt<AuthRemoteDataSource>().getMe();
      updateUser(user);
    } catch (e) {
      // Best-effort — a real auth failure (expired/invalid token) is caught
      // by the 401 interceptor separately; this just leaves `user` null for
      // this session, same as before this fetch existed.
      debugPrint('AuthCubit._fetchProfile failed: $e');
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
      emit(
        AuthAuthenticated(
          accessToken: s.accessToken,
          refreshToken: newRefresh,
          user: s.user,
        ),
      );
    }
  }

  Future<void> updateAccessToken(String newAccess) async {
    final s = state;
    if (s is AuthAuthenticated) {
      await _secureStorage.write(key: 'access', value: newAccess);
      emit(
        AuthAuthenticated(
          accessToken: newAccess,
          refreshToken: s.refreshToken,
          user: s.user,
        ),
      );
    }
  }

  void updateUser(UserEntity user) {
    final s = state;
    if (s is AuthAuthenticated) {
      emit(
        AuthAuthenticated(
          accessToken: s.accessToken,
          refreshToken: s.refreshToken,
          user: user,
        ),
      );
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
