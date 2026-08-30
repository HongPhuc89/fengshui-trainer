import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../../shared/theme/app_colors.dart';
import '../../domain/entities/book.dart';

class PurchaseBottomSheet extends StatelessWidget {
  final BookDetail book;
  final int balance;
  final VoidCallback? onConfirm;
  final bool isLoading;
  final String? errorMessage;

  const PurchaseBottomSheet({
    super.key,
    required this.book,
    required this.balance,
    this.onConfirm,
    this.isLoading = false,
    this.errorMessage,
  });

  static Future<void> show(
    BuildContext context, {
    required BookDetail book,
    required int balance,
    VoidCallback? onConfirm,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => PurchaseBottomSheet(
        book: book,
        balance: balance,
        onConfirm: onConfirm,
      ),
    );
  }

  bool get _canAfford => balance >= book.priceLt;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.lockGray,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),

          const Text(
            'Mua sách',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 20),

          // Book preview row
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: book.coverImageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: book.coverImageUrl!,
                        width: 60,
                        height: 80,
                        fit: BoxFit.cover,
                      )
                    : Container(
                        width: 60,
                        height: 80,
                        color: AppColors.surfaceAlt,
                        child: const Icon(Icons.menu_book,
                            color: AppColors.textSecondary),
                      ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  book.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Price row
          _PriceRow(label: 'Giá', value: '${book.priceLt} LT'),
          const SizedBox(height: 8),
          _PriceRow(
            label: 'Số dư',
            value: '$balance LT',
            valueColor: _canAfford ? AppColors.primaryGold : AppColors.error,
          ),

          if (!_canAfford)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Số dư không đủ. Liên hệ admin để nạp thêm Linh Thạch.',
                style: TextStyle(color: AppColors.error, fontSize: 12),
              ),
            ),

          if (errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                errorMessage!,
                style:
                    const TextStyle(color: AppColors.error, fontSize: 12),
              ),
            ),

          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            child: isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: AppColors.primaryGold))
                : ElevatedButton(
                    onPressed: _canAfford ? onConfirm : null,
                    child: const Text('Xác nhận mua'),
                  ),
          ),
        ],
      ),
    );
  }
}

class _PriceRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _PriceRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: const TextStyle(
                color: AppColors.textSecondary, fontSize: 14)),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? AppColors.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
