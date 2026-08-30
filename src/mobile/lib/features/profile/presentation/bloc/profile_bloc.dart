import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/auth/auth_cubit.dart';
import '../../../auth/domain/entities/user.dart';
import '../../domain/entities/profile.dart';
import '../../domain/repositories/profile_repository.dart';

part 'profile_event.dart';
part 'profile_state.dart';

@injectable
class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final ProfileRepository _repository;
  final AuthCubit _authCubit;

  ProfileBloc(this._repository, this._authCubit)
      : super(ProfileInitial()) {
    on<LoadProfile>(_onLoad);
    on<UpdateName>(_onUpdateName);
    on<ChangePassword>(_onChangePassword);
    on<UpdateAvatar>(_onUpdateAvatar);
    on<Logout>(_onLogout);
  }

  Future<void> _onLoad(
      LoadProfile event, Emitter<ProfileState> emit) async {
    emit(ProfileLoading());

    final userResult = await _repository.getMe();
    final deviceResult = await _repository.getDeviceStatus();

    userResult.fold(
      (f) => emit(ProfileError(f.message)),
      (user) {
        DeviceStatus? deviceStatus;
        deviceResult.fold((_) => null, (d) => deviceStatus = d);
        emit(ProfileLoaded(user: user, deviceStatus: deviceStatus));
      },
    );
  }

  Future<void> _onUpdateName(
      UpdateName event, Emitter<ProfileState> emit) async {
    final s = state;
    if (s is! ProfileLoaded) return;
    emit(ProfileSaving(s));

    final result = await _repository.updateName(event.name);
    result.fold(
      (f) => emit(ProfileActionError(s, f.message)),
      (user) => emit(ProfileLoaded(
          user: user, deviceStatus: s.deviceStatus)),
    );
  }

  Future<void> _onChangePassword(
      ChangePassword event, Emitter<ProfileState> emit) async {
    final s = state;
    if (s is! ProfileLoaded) return;
    emit(ProfileSaving(s));

    final result = await _repository.changePassword(
        event.oldPassword, event.newPassword);
    result.fold(
      (f) => emit(ProfileActionError(s, f.message)),
      (_) => emit(ProfileLoaded(
          user: s.user,
          deviceStatus: s.deviceStatus,
          passwordChanged: true)),
    );
  }


  Future<void> _onUpdateAvatar(
      UpdateAvatar event, Emitter<ProfileState> emit) async {
    final s = state;
    if (s is! ProfileLoaded) return;
    emit(ProfileSaving(s));

    final result = await _repository.updateAvatar(event.filePath);
    result.fold(
      (f) => emit(ProfileActionError(s, f.message)),
      (user) => emit(
          ProfileLoaded(user: user, deviceStatus: s.deviceStatus)),
    );
  }

  Future<void> _onLogout(
      Logout event, Emitter<ProfileState> emit) async {
    _authCubit.clearAuth();
    emit(ProfileInitial());
  }
}
