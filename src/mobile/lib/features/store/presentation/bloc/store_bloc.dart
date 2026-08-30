import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../domain/entities/wallet.dart';
import '../../domain/repositories/wallet_repository.dart';

part 'store_event.dart';
part 'store_state.dart';

@injectable
class StoreBloc extends Bloc<StoreEvent, StoreState> {
  final WalletRepository _repository;

  StoreBloc(this._repository) : super(StoreInitial()) {
    on<LoadStore>(_onLoad);
  }

  Future<void> _onLoad(
      LoadStore event, Emitter<StoreState> emit) async {
    emit(StoreLoading());

    final balanceResult = await _repository.getBalance();
    final txResult = await _repository.getTransactions();

    Wallet? wallet;
    List<Transaction> transactions = [];
    String? error;

    balanceResult.fold(
      (f) => error = f.message,
      (w) => wallet = w,
    );
    txResult.fold(
      (_) => null, // transactions are optional
      (txs) => transactions = txs,
    );

    if (error != null && wallet == null) {
      emit(StoreError(error!));
    } else {
      emit(StoreLoaded(
        balance: wallet?.balance ?? 0,
        transactions: transactions,
      ));
    }
  }
}
