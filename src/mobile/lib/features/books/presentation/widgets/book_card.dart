import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../../core/observability/sentry_log_service.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../../domain/entities/book.dart';

class BookCard extends StatelessWidget {
  final Book book;
  final int? currentChapter;
  final int? currentPage;
  final VoidCallback? onTap;

  const BookCard({
    super.key,
    required this.book,
    this.currentChapter,
    this.currentPage,
    this.onTap,
  });

  bool get _isReading => currentChapter != null;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: AspectRatio(
          aspectRatio: 2 / 3,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Cover image
              book.coverImageUrl != null
                  ? CachedNetworkImage(
                      imageUrl: book.coverImageUrl!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                        color: AppColors.surface,
                        child: const Center(
                          child: Icon(Icons.menu_book,
                              color: AppColors.textSecondary, size: 40),
                        ),
                      ),
                      errorWidget: (_, url, ___) {
                        SentryLogService.trackImageLoadError(url);
                        return _placeholder();
                      },
                    )
                  : _placeholder(),

              // Reading progress overlay
              if (_isReading)
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [Colors.black87, Colors.transparent],
                      ),
                    ),
                    padding: const EdgeInsets.all(8),
                    child: Text(
                      'Ch.$currentChapter${currentPage != null ? ' · Tr.$currentPage' : ''}',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w500),
                    ),
                  ),
                ),

              // "MỚI" badge
              if (book.isNewRelease)
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryGold,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'MỚI',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87),
                    ),
                  ),
                ),

              // VIP badge
              if (book.isVipOnly && !book.hasPurchased)
                Positioned(
                  top: 6,
                  left: 6,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceAlt,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'VIP',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryGold),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _placeholder() => Container(
        color: AppColors.surface,
        child: const Center(
          child: Icon(Icons.menu_book,
              color: AppColors.textSecondary, size: 40),
        ),
      );
}
