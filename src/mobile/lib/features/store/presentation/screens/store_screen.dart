import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../../../../../shared/widgets/gem_icon.dart';
import '../../domain/entities/wallet.dart';
import '../bloc/store_bloc.dart';

/// Mirrors the web's StoreView.vue ("Đóng Góp Cộng Đồng") so both surfaces read
/// as one product: same sections, same per-type transaction icons, same copy.
const _adminEmail = 'admin@huyenhoc.pro';

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
        title: const Text('Đóng Góp Cộng Đồng'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<StoreBloc>().add(const LoadStore()),
          ),
        ],
      ),
      body: BlocBuilder<StoreBloc, StoreState>(
        builder: (context, state) {
          if (state is StoreLoading) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primaryGold),
            );
          }
          if (state is StoreError) {
            return _ErrorState(message: state.message);
          }
          if (state is StoreLoaded) {
            return RefreshIndicator(
              color: AppColors.primaryGold,
              onRefresh: () async =>
                  context.read<StoreBloc>().add(const LoadStore()),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                children: [
                  _BalanceCard(balance: state.balance),
                  const SizedBox(height: 16),
                  const _ContactCard(),
                  const SizedBox(height: 24),
                  const Text(
                    'Lịch sử giao dịch',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (state.transactions.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Text(
                        'Chưa có giao dịch nào.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, color: Colors.white38),
                      ),
                    )
                  else
                    for (var i = 0; i < state.transactions.length; i++)
                      _TransactionRow(
                        tx: state.transactions[i],
                        isLast: i == state.transactions.length - 1,
                      ),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 48),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => context.read<StoreBloc>().add(const LoadStore()),
            child: const Text('Thử lại'),
          ),
        ],
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({required this.balance});

  final int balance;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      decoration: BoxDecoration(
        // Same 135° purple gradient as .donate__balance-card on the web.
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3A2060), Color(0xFF1A1040)],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Text(
            'LINH THẠCH CỦA BẠN',
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withValues(alpha: 0.65),
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                NumberFormat.decimalPattern('vi_VN').format(balance),
                style: const TextStyle(
                  fontSize: 40,
                  fontWeight: FontWeight.w800,
                  height: 1,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(width: 8),
              const GemIcon(size: 32),
            ],
          ),
        ],
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primaryGold.withValues(alpha: 0.15),
            ),
            child: const Icon(Icons.mail_outline,
                color: AppColors.primaryGold, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Đóng góp Linh Thạch',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Liên hệ quản trị viên để được hỗ trợ đóng góp '
                  'Linh Thạch vào tài khoản.',
                  style: TextStyle(
                    fontSize: 12.5,
                    height: 1.45,
                    color: Colors.white.withValues(alpha: 0.55),
                  ),
                ),
                const SizedBox(height: 4),
                GestureDetector(
                  onTap: () => launchUrl(Uri(scheme: 'mailto', path: _adminEmail)),
                  child: const Text(
                    _adminEmail,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryGold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Icon and colours per transaction type, matching the web's TX_CONFIG.
class _TxStyle {
  const _TxStyle(this.icon, this.background, this.foreground);

  final IconData icon;
  final Color background;
  final Color foreground;

  static const _byType = {
    'ADMIN_TOPUP': _TxStyle(Icons.add, Color(0x401565C0), Color(0xFF64B5F6)),
    'ADMIN_EDIT': _TxStyle(Icons.add, Color(0x401565C0), Color(0xFF64B5F6)),
    'RECHARGE_VOUCHER':
        _TxStyle(Icons.add, Color(0x401565C0), Color(0xFF64B5F6)),
    'PURCHASE_BOOK':
        _TxStyle(Icons.menu_book, Color(0x40C62828), Color(0xFFEF9A9A)),
    'PURCHASE_VIDEO':
        _TxStyle(Icons.play_arrow, Color(0x40E65100), Color(0xFFFFB74D)),
    'VIP_SUBSCRIPTION':
        _TxStyle(Icons.star, Color(0x33C5A551), AppColors.primaryGold),
  };

  /// Unknown types fall back to the book style, as the web does.
  static _TxStyle of(String type) =>
      _byType[type] ??
      const _TxStyle(Icons.menu_book, Color(0x40C62828), Color(0xFFEF9A9A));
}

class _TransactionRow extends StatelessWidget {
  const _TransactionRow({required this.tx, required this.isLast});

  final Transaction tx;
  final bool isLast;

  /// "Hôm nay / Hôm qua" for anything recent, an absolute date beyond that —
  /// the same rule the web page uses.
  String _formatDate(DateTime date) {
    final diff = DateTime.now().difference(date);
    final time = DateFormat('HH:mm').format(date);
    if (diff.inHours < 24) return 'Hôm nay, $time';
    if (diff.inHours < 48) return 'Hôm qua, $time';
    return DateFormat('dd MMM yyyy', 'vi_VN').format(date);
  }

  @override
  Widget build(BuildContext context) {
    final style = _TxStyle.of(tx.type);
    final formatted = NumberFormat.decimalPattern('vi_VN').format(tx.amount.abs());

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.2))),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration:
                BoxDecoration(shape: BoxShape.circle, color: style.background),
            child: Icon(style.icon, color: style.foreground, size: 18),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx.description.isNotEmpty ? tx.description : tx.type,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _formatDate(tx.createdAt),
                  style: TextStyle(
                    fontSize: 11.5,
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Row(
            children: [
              Text(
                '${tx.isCredit ? '+' : ''}$formatted',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: tx.isCredit
                      ? const Color(0xFF66BB6A)
                      : Colors.white.withValues(alpha: 0.7),
                ),
              ),
              const SizedBox(width: 3),
              const GemIcon(size: 11),
            ],
          ),
        ],
      ),
    );
  }
}
