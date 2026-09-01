part of 'auth_bloc.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();
  @override
  List<Object?> get props => [];
}

/// From the user's point of view there is only ever "log in": [pairingCode] is
/// filled in on the same form when the server asks for it.
class LoginSubmitted extends AuthEvent {
  final String email;
  final String password;
  final String? pairingCode;
  const LoginSubmitted({
    required this.email,
    required this.password,
    this.pairingCode,
  });
  @override
  List<Object?> get props => [email, password, pairingCode];
}


class LogoutRequested extends AuthEvent {
  final String refreshToken;
  const LogoutRequested(this.refreshToken);
  @override
  List<Object> get props => [refreshToken];
}
