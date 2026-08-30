import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/user.dart';

abstract class AuthRepository {
  /// [pairingCode] is only needed the first time this handset appears; after
  /// that the server recognises it by device id.
  Future<Either<Failure, UserEntity>> login({
    required String email,
    required String password,
    String? pairingCode,
  });


  Future<Either<Failure, void>> logout(String refreshToken);

  Future<Either<Failure, UserEntity>> getMe();
}
