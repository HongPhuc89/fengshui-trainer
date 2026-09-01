import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/wallet.dart';

abstract class WalletRepository {
  Future<Either<Failure, Wallet>> getBalance();
  Future<Either<Failure, List<Transaction>>> getTransactions();
}
