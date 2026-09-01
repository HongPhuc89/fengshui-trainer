part of 'profile_bloc.dart';

abstract class ProfileEvent extends Equatable {
  const ProfileEvent();
  @override
  List<Object?> get props => [];
}

class LoadProfile extends ProfileEvent {
  const LoadProfile();
}

class UpdateName extends ProfileEvent {
  final String name;
  const UpdateName(this.name);
  @override
  List<Object?> get props => [name];
}

class ChangePassword extends ProfileEvent {
  final String oldPassword;
  final String newPassword;
  const ChangePassword(this.oldPassword, this.newPassword);
  @override
  List<Object?> get props => [oldPassword, newPassword];
}


class UpdateAvatar extends ProfileEvent {
  final String filePath;
  const UpdateAvatar(this.filePath);
  @override
  List<Object?> get props => [filePath];
}

class Logout extends ProfileEvent {
  const Logout();
}
