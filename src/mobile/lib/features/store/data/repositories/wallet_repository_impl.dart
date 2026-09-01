import 'package:flutter/foundation.dart';
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../domain/entities/wallet.dart';
import '../../domain/repositories/wallet_repository.dart';
import '../datasources/wallet_remote_datasource.dart';

@Injectable(as: WalletRepository)
class WalletRepositoryImpl implements WalletRepository {
  final WalletRemoteDataSource _remote;

  WalletRepositoryImpl(this._remote);

  @override
  Future<Either<Failure, Wallet>> getBalance() async {
    try {
      final data = await _remote.getBalance();
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, List<Transaction>>>
      getTransactions() async {
    try {
      final data = await _remote.getTransactions();
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }
}
