import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../../domain/entities/wallet.dart';
import '../bloc/store_bloc.dart';

class StoreScreen extends StatelessWidget {
  const StoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<StoreBloc>()..add(const LoadStore()),
      child: const _StoreView(),
    );
  }
}

class _StoreView extends StatelessWidget {
  const _StoreView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kho báu'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                context.read<StoreBloc>().add(const LoadStore()),
          ),
        ],
      ),
      body: BlocBuilder<StoreBloc, StoreState>(
        builder: (context, state) {
          if (state is StoreLoading) {
            return const Center(
                child: CircularProgressIndicator(
                    color: AppColors.primaryGold));
          }

          if (state is StoreError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline,
                      color: AppColors.error, size: 48),
                  const SizedBox(height: 12),
                  Text(state.message,
                      style: const TextStyle(
                          color: AppColors.textSecondary)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context
                        .read<StoreBloc>()
                        .add(const LoadStore()),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }

          if (state is StoreLoaded) {
            return Column(
              children: [
                // Balance card
                _BalanceCard(balance: state.balance),
                // Contact info
                const Padding(
                  padding: EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  child: Text(
                    'Liên hệ admin để nạp thêm Linh Thạch',
                    style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),
                const Divider(),
                const Padding(
                  padding: EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Lịch sử giao dịch',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: state.transactions.isEmpty
                      ? const Center(
                          child: Text(
                            'Chưa có giao dịch nào',
                            style: TextStyle(
                                color: AppColors.textSecondary),
                          ),
                        )
                      : ListView.builder(
                          itemCount: state.transactions.length,
                          itemBuilder: (_, i) => _TransactionItem(
                            tx: state.transactions[i],
                          ),
                        ),
                ),
              ],
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final int balance;

  const _BalanceCard({required this.balance});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1A1A2E), Color(0xFF16213E)],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: AppColors.primaryGold.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.diamond,
              color: AppColors.primaryGold, size: 32),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Số dư',
                style: TextStyle(
                    color: AppColors.textSecondary, fontSize: 13),
              ),
              Text(
                '$balance LT',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryGold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TransactionItem extends StatelessWidget {
  final Transaction tx;

  const _TransactionItem({required this.tx});

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd/MM/yyyy HH:mm');
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: tx.isCredit
            ? Colors.green.withOpacity(0.15)
            : AppColors.error.withOpacity(0.15),
        child: Icon(
          tx.isCredit ? Icons.add : Icons.remove,
          color: tx.isCredit ? Colors.green : AppColors.error,
          size: 20,
        ),
      ),
      title: Text(
        tx.description.isNotEmpty ? tx.description : tx.type,
        style: const TextStyle(
            color: AppColors.textPrimary, fontSize: 14),
      ),
      subtitle: Text(
        fmt.format(tx.createdAt),
        style: const TextStyle(
            color: AppColors.textSecondary, fontSize: 12),
      ),
      trailing: Text(
        '${tx.isCredit ? '+' : ''}${tx.amount} LT',
        style: TextStyle(
          color: tx.isCredit ? Colors.green : AppColors.error,
          fontWeight: FontWeight.bold,
          fontSize: 14,
        ),
      ),
    );
  }
}
