import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/error/failures.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';

part 'auth_event.dart';
part 'auth_state.dart';

@injectable
class AuthBloc extends Bloc<AuthEvent, AuthBlocState> {
  final AuthRepository _authRepository;

  AuthBloc(this._authRepository) : super(AuthBlocInitial()) {
    on<LoginSubmitted>(_onLoginSubmitted);
    on<LogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onLoginSubmitted(
    LoginSubmitted event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(AuthBlocLoading());

    // Hold the pairing state so a wrong code returns to the same form with the
    // code field still open, rather than dropping back to a bare login screen.
    final pairing =
        state is AuthBlocPairingRequired ? state as AuthBlocPairingRequired : null;

    final result = await _authRepository.login(
      email: event.email,
      password: event.password,
      pairingCode: event.pairingCode,
    );

    result.fold(
      (failure) {
        if (failure is PairingRequiredFailure) {
          emit(AuthBlocPairingRequired(
            hasUnclaimedSlot: failure.hasUnclaimedSlot,
            supportEmail: failure.supportEmail,
          ));
        } else if (pairing != null && event.pairingCode != null) {
          emit(pairing.withError(failure.message));
        } else {
          emit(AuthBlocError(failure.message));
        }
      },
      (user) => emit(AuthBlocSuccess(user)),
    );
  }



  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthBlocState> emit,
  ) async {
    // Logout does not unbind the handset: the user must be able to sign back in
    // on this same phone without asking an admin for a code.
    await _authRepository.logout(event.refreshToken);
    emit(AuthBlocInitial());
  }
}
