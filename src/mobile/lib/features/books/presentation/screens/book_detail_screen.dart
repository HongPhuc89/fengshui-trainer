import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../bloc/book_detail_bloc.dart';
import '../widgets/purchase_bottom_sheet.dart';
import '../../domain/entities/book.dart';

class BookDetailScreen extends StatelessWidget {
  final String slug;
  const BookDetailScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          getIt<BookDetailBloc>()..add(LoadBookDetail(slug)),
      child: _BookDetailView(slug: slug),
    );
  }
}

class _BookDetailView extends StatelessWidget {
  final String slug;
  const _BookDetailView({required this.slug});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<BookDetailBloc, BookDetailState>(
      listener: (context, state) {
        if (state is BookDetailPurchaseError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ),
          );
        }
        if (state is BookDetailLoaded && state.detail.hasPurchased) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Mua sách thành công!'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is BookDetailLoading) {
          return const Scaffold(
            body: Center(
                child: CircularProgressIndicator(
                    color: AppColors.primaryGold)),
          );
        }

        if (state is BookDetailError) {
          return Scaffold(
            appBar: AppBar(),
            body: Center(
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
                        .read<BookDetailBloc>()
                        .add(LoadBookDetail(slug)),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            ),
          );
        }

        final detail = state is BookDetailLoaded
            ? state.detail
            : state is BookDetailPurchasing
                ? state.detail
                : state is BookDetailPurchaseError
                    ? state.detail
                    : null;

        if (detail == null) return const Scaffold();

        return Scaffold(
          body: CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 280,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  background: detail.coverImageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: detail.coverImageUrl!,
                          fit: BoxFit.cover,
                        )
                      : Container(color: AppColors.surfaceAlt),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(detail.title,
                          style: Theme.of(context)
                              .textTheme
                              .headlineMedium),
                      const SizedBox(height: 4),
                      Text(detail.author,
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14)),
                      const SizedBox(height: 8),
                      if (detail.category != null)
                        Chip(
                          label: Text(detail.category!.name,
                              style:
                                  const TextStyle(fontSize: 12)),
                          padding: EdgeInsets.zero,
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                        ),
                      const SizedBox(height: 12),

                      // Price / access indicator
                      _PriceSection(detail: detail),
                      const SizedBox(height: 16),

                      // Continue reading button
                      if (detail.hasPurchased &&
                          detail.lastReadChapterOrder != null)
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.play_arrow),
                            label: Text(
                                'Tiếp tục đọc — Ch.${detail.lastReadChapterOrder}'),
                            onPressed: () => context.push(
                                '/books/${detail.slug}/read?chapter=${detail.lastReadChapterOrder}'),
                          ),
                        ),
                      if (detail.hasPurchased &&
                          detail.lastReadChapterOrder == null)
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.play_arrow),
                            label: const Text('Bắt đầu đọc'),
                            onPressed: () => context.push(
                                '/books/${detail.slug}/read?chapter=1'),
                          ),
                        ),

                      const SizedBox(height: 16),

                      // Description
                      if (detail.description != null &&
                          detail.description!.isNotEmpty)
                        _ExpandableDescription(
                            text: detail.description!),

                      const SizedBox(height: 16),

                      // Chapters
                      const Text(
                        'Danh sách chương',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ...detail.chapters.map((ch) => _ChapterListItem(
                            chapter: ch,
                            slug: detail.slug,
                            onLocked: () =>
                                _showPurchase(context, detail),
                          )),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showPurchase(BuildContext context, BookDetail detail) {
    // Balance not available here — store feature provides actual balance
    PurchaseBottomSheet.show(
      context,
      book: detail,
      balance: 0,
      onConfirm: () {
        Navigator.of(context).pop();
        context.read<BookDetailBloc>().add(PurchaseBook(detail.slug));
      },
    );
  }
}

class _PriceSection extends StatelessWidget {
  final BookDetail detail;
  const _PriceSection({required this.detail});

  @override
  Widget build(BuildContext context) {
    if (detail.isVipOnly) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.primaryGold.withOpacity(0.15),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.primaryGold.withOpacity(0.4)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.diamond, color: AppColors.primaryGold, size: 16),
            SizedBox(width: 6),
            Text('VIP', style: TextStyle(color: AppColors.primaryGold)),
          ],
        ),
      );
    }
    if (detail.priceLt == 0) {
      return const Text('Miễn phí',
          style: TextStyle(color: AppColors.success, fontSize: 14));
    }
    return Row(
      children: [
        const Icon(Icons.diamond_outlined,
            color: AppColors.primaryGold, size: 16),
        const SizedBox(width: 4),
        Text('${detail.priceLt} LT',
            style: const TextStyle(
                color: AppColors.primaryGold,
                fontSize: 14,
                fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _ChapterListItem extends StatelessWidget {
  final BookChapterMeta chapter;
  final String slug;
  final VoidCallback onLocked;

  const _ChapterListItem({
    required this.chapter,
    required this.slug,
    required this.onLocked,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
      leading: CircleAvatar(
        backgroundColor: AppColors.surfaceAlt,
        child: Text(
          '${chapter.order}',
          style: const TextStyle(
              color: AppColors.primaryGold, fontSize: 13),
        ),
      ),
      title: Text(
        chapter.title,
        style: const TextStyle(
            color: AppColors.textPrimary, fontSize: 14),
      ),
      subtitle: Text(
        '${chapter.pageCount} trang',
        style: const TextStyle(
            color: AppColors.textSecondary, fontSize: 12),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (chapter.isDemo)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.demoBadge.withOpacity(0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text('Demo',
                  style:
                      TextStyle(fontSize: 10, color: AppColors.demoBadge)),
            ),
          const SizedBox(width: 4),
          if (!chapter.canAccess)
            const Icon(Icons.lock_outline, color: AppColors.lockGray)
          else if (chapter.isCompleted)
            const Icon(Icons.check_circle, color: AppColors.success),
        ],
      ),
      onTap: () {
        if (chapter.canAccess) {
          context.push('/books/$slug/read?chapter=${chapter.order}');
        } else {
          onLocked();
        }
      },
    );
  }
}

class _ExpandableDescription extends StatefulWidget {
  final String text;
  const _ExpandableDescription({required this.text});

  @override
  State<_ExpandableDescription> createState() =>
      _ExpandableDescriptionState();
}

class _ExpandableDescriptionState
    extends State<_ExpandableDescription> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.text,
          maxLines: _expanded ? null : 4,
          overflow:
              _expanded ? TextOverflow.visible : TextOverflow.ellipsis,
          style: const TextStyle(
              color: AppColors.textSecondary, fontSize: 14, height: 1.5),
        ),
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              _expanded ? 'Thu gọn' : 'Xem thêm',
              style: const TextStyle(
                  color: AppColors.primaryGold, fontSize: 13),
            ),
          ),
        ),
      ],
    );
  }
}
