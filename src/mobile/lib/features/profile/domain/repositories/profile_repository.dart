import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../auth/domain/entities/user.dart';
import '../entities/profile.dart';

abstract class ProfileRepository {
  Future<Either<Failure, UserEntity>> getMe();
  Future<Either<Failure, UserEntity>> updateName(String name);
  Future<Either<Failure, void>> changePassword(
      String oldPassword, String newPassword);
  Future<Either<Failure, DeviceStatus>> getDeviceStatus();
  Future<Either<Failure, UserEntity>> updateAvatar(String filePath);
}
