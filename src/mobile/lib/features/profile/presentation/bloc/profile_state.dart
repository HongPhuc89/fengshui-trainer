part of 'profile_bloc.dart';

abstract class ProfileState extends Equatable {
  const ProfileState();
  @override
  List<Object?> get props => [];
}

class ProfileInitial extends ProfileState {}

class ProfileLoading extends ProfileState {}

class ProfileLoaded extends ProfileState {
  final UserEntity user;
  final DeviceStatus? deviceStatus;
  final bool passwordChanged;

  const ProfileLoaded({
    required this.user,
    this.deviceStatus,
    this.passwordChanged = false,
  });

  @override
  List<Object?> get props =>
      [user, deviceStatus, passwordChanged];
}

class ProfileSaving extends ProfileState {
  final ProfileLoaded previous;
  const ProfileSaving(this.previous);
  @override
  List<Object?> get props => [previous];
}

class ProfileActionError extends ProfileState {
  final ProfileLoaded previous;
  final String message;
  const ProfileActionError(this.previous, this.message);
  @override
  List<Object?> get props => [previous, message];
}

class ProfileError extends ProfileState {
  final String message;
  const ProfileError(this.message);
  @override
  List<Object?> get props => [message];
}
