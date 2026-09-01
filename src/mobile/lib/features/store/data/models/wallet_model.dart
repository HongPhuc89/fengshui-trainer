import '../../domain/entities/wallet.dart';

class WalletModel extends Wallet {
  const WalletModel({required super.balance});

  factory WalletModel.fromJson(Map<String, dynamic> json) {
    return WalletModel(
      balance: json['balance'] as int? ??
          json['lt_balance'] as int? ?? 0,
    );
  }
}

class TransactionModel extends Transaction {
  const TransactionModel({
    required super.id,
    required super.type,
    required super.amount,
    required super.description,
    required super.createdAt,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    return TransactionModel(
      // WalletTransactionSerializer sends public_id; 'id' was always null,
      // so every row carried the literal string "null" as its id.
      id: (json['public_id'] ?? json['id'] ?? '').toString(),
      type: json['type'] as String? ??
          json['transaction_type'] as String? ?? 'unknown',
      amount: json['amount'] as int? ??
          (json['lt_amount'] as num?)?.toInt() ?? 0,
      description: json['description'] as String? ??
          json['note'] as String? ?? '',
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
    );
  }
}
