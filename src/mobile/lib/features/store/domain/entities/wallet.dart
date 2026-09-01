import 'package:equatable/equatable.dart';

class Wallet extends Equatable {
  final int balance;

  const Wallet({required this.balance});

  @override
  List<Object?> get props => [balance];
}

class Transaction extends Equatable {
  final String id;
  final String type; // 'topup' | 'purchase' | etc.
  final int amount;
  final String description;
  final DateTime createdAt;

  const Transaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.description,
    required this.createdAt,
  });

  bool get isCredit => amount > 0;

  @override
  List<Object?> get props => [id, type, amount, createdAt];
}
