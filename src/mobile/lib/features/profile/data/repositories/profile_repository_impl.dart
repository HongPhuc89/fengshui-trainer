import 'package:flutter/foundation.dart';
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/auth/auth_cubit.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../auth/domain/entities/user.dart';
import '../../domain/entities/profile.dart';
import '../../domain/repositories/profile_repository.dart';
import '../datasources/profile_remote_datasource.dart';

@Injectable(as: ProfileRepository)
class ProfileRepositoryImpl implements ProfileRepository {
  final ProfileRemoteDataSource _remote;
  final AuthCubit _authCubit;

  ProfileRepositoryImpl(this._remote, this._authCubit);

  @override
  Future<Either<Failure, UserEntity>> getMe() async {
    try {
      final user = await _remote.getMe();
      _authCubit.updateUser(user);
      return Right(user);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, UserEntity>> updateName(String name) async {
    try {
      final user = await _remote.updateName(name);
      _authCubit.updateUser(user);
      return Right(user);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> changePassword(
      String oldPassword, String newPassword) async {
    try {
      await _remote.changePassword(oldPassword, newPassword);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, DeviceStatus>> getDeviceStatus() async {
    try {
      final data = await _remote.getDeviceStatus();
      // The mobile binding is the meaningful "device" here; a web browser is a
      // disposable slot. Self-reset was removed, so no reset fields are read.
      final mobile = data['mobile_device'] as Map<String, dynamic>?;

      return Right(DeviceStatus(
        deviceName: mobile?['device_name'] as String? ?? 'Thiết bị hiện tại',
        clientCode: mobile?['client_code'] as String?,
        boundAt: mobile?['bound_at'] != null
            ? DateTime.tryParse(mobile!['bound_at'] as String)
            : null,
      ));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }


  @override
  Future<Either<Failure, UserEntity>> updateAvatar(
      String filePath) async {
    try {
      final user = await _remote.updateAvatar(filePath);
      _authCubit.updateUser(user);
      return Right(user);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }
}
