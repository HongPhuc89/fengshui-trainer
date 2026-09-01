part of 'auth_bloc.dart';

abstract class AuthBlocState extends Equatable {
  const AuthBlocState();
  @override
  List<Object?> get props => [];
}

class AuthBlocInitial extends AuthBlocState {}

class AuthBlocLoading extends AuthBlocState {}

class AuthBlocSuccess extends AuthBlocState {
  final UserEntity user;
  const AuthBlocSuccess(this.user);
  @override
  List<Object> get props => [user];
}

class AuthBlocError extends AuthBlocState {
  final String message;
  const AuthBlocError(this.message);
  @override
  List<Object> get props => [message];
}

/// The handset needs a pairing code before it can be used.
class AuthBlocPairingRequired extends AuthBlocState {
  /// True when a slot is already waiting, so the form can open the code field
  /// instead of pointing the user at support.
  final bool hasUnclaimedSlot;
  final String? supportEmail;

  /// Set after a failed attempt: how many tries remain, or why it was refused.
  final String? errorMessage;

  const AuthBlocPairingRequired({
    this.hasUnclaimedSlot = false,
    this.supportEmail,
    this.errorMessage,
  });

  AuthBlocPairingRequired withError(String message) => AuthBlocPairingRequired(
        hasUnclaimedSlot: hasUnclaimedSlot,
        supportEmail: supportEmail,
        errorMessage: message,
      );

  @override
  List<Object?> get props => [hasUnclaimedSlot, supportEmail, errorMessage];
}

