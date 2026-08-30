part of 'store_bloc.dart';

abstract class StoreState extends Equatable {
  const StoreState();
  @override
  List<Object?> get props => [];
}

class StoreInitial extends StoreState {}

class StoreLoading extends StoreState {}

class StoreLoaded extends StoreState {
  final int balance;
  final List<Transaction> transactions;

  const StoreLoaded({
    required this.balance,
    required this.transactions,
  });

  @override
  List<Object?> get props => [balance, transactions];
}

class StoreError extends StoreState {
  final String message;
  const StoreError(this.message);
  @override
  List<Object?> get props => [message];
}
