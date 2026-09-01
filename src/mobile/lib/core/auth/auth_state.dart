part of 'auth_cubit.dart';

abstract class AuthState {}

class AuthUnauthenticated extends AuthState {}

class AuthAuthenticated extends AuthState {
  final String accessToken;
  final String refreshToken;
  final UserEntity? user;

  AuthAuthenticated({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });
}
