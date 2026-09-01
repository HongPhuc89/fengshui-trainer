import 'package:flutter/foundation.dart';
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/auth/auth_cubit.dart';
import '../../../../core/device/device_service.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../models/user_model.dart';

@Injectable(as: AuthRepository)
class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remote;
  final AuthCubit _authCubit;
  final DeviceService _deviceService;

  AuthRepositoryImpl(this._remote, this._authCubit, this._deviceService);

  @override
  Future<Either<Failure, UserEntity>> login({
    required String email,
    required String password,
    String? pairingCode,
  }) async {
    try {
      final data = await _remote.login(
        email: email, password: password, pairingCode: pairingCode);
      // Read the user out of the login response rather than calling getMe():
      // the token is not stored yet, so a second request would go out without an
      // Authorization header and come back 401 — reporting a failed login even
      // though the server had already bound the handset.
      final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      await _authCubit.setTokens(
        data['access'] as String,
        data['refresh'] as String,
        user,
      );
      // The handset is bound from here on, so the login form can stop offering
      // the pairing-code field.
      await _deviceService.markPaired();
      return Right(user);
    } on PairingRequiredException catch (e) {
      return Left(PairingRequiredFailure(
        hasUnclaimedSlot: e.hasUnclaimedSlot,
        supportEmail: e.supportEmail,
      ));
    } on PairingFailedException catch (e) {
      return Left(ServerFailure(e.message));
    } on ServerException catch (e) {
      if (e.statusCode == 401) {
        return const Left(ServerFailure('Sai email hoặc mật khẩu'));
      }
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }


  @override
  Future<Either<Failure, void>> logout(String refreshToken) async {
    try {
      await _remote.logout(refreshToken);
      _authCubit.clearAuth();
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, UserEntity>> getMe() async {
    try {
      return Right(await _remote.getMe());
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }
}
