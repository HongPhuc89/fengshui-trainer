import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/auth/auth_cubit.dart';
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
      create: (_) => getIt<BookDetailBloc>()..add(LoadBookDetail(slug)),
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
        if (state is BookDetailPurchaseSuccess) {
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
              child: CircularProgressIndicator(color: AppColors.primaryGold),
            ),
          );
        }

        if (state is BookDetailError) {
          return Scaffold(
            appBar: AppBar(),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    color: AppColors.error,
                    size: 48,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    state.message,
                    style: const TextStyle(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.read<BookDetailBloc>().add(
                      LoadBookDetail(slug),
                    ),
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
            : state is BookDetailPurchaseSuccess
            ? state.detail
            : null;
        final progress = state is BookDetailLoaded
            ? state.progress
            : state is BookDetailPurchasing
            ? state.progress
            : state is BookDetailPurchaseError
            ? state.progress
            : state is BookDetailPurchaseSuccess
            ? state.progress
            : null;

        if (detail == null) return const Scaffold();

        // VIP is the logged-in user's property, not the book's — mirrors
        // web's authStore.user?.user_type === 'VIP'. No BookDetail.isVipOnly
        // to read here on purpose (see book.dart's doc comment).
        final authState = context.watch<AuthCubit>().state;
        final isVip =
            authState is AuthAuthenticated && (authState.user?.isVip ?? false);
        final isUnlocked = detail.isFree || isVip || detail.hasPurchased;

        // The progress endpoint always returns a value (defaults to
        // chapter 1/page 1 when the user has never read anything — it
        // never signals "no progress" with null/404), so `progress != null`
        // alone can't distinguish "never started" from "started, still on
        // page 1". Treating "past page 1" or "finished ≥1 chapter" as
        // having started matches the intent without a dedicated backend
        // flag; the one edge case this misses (finished exactly page 1 then
        // left) is rare enough to accept (design doc §4).
        final hasStarted =
            progress != null &&
            (progress.currentPage > 1 ||
                detail.chapters.any((c) => c.isCompleted));

        final coverUrl = detail.smallCoverUrl ?? detail.coverImageUrl;

        return Scaffold(
          body: RefreshIndicator(
            color: AppColors.primaryGold,
            onRefresh: () async => context.read<BookDetailBloc>().add(
              LoadBookDetail(slug, forceRefresh: true),
            ),
            child: CustomScrollView(
              slivers: [
                SliverAppBar(
                  expandedHeight: 280,
                  pinned: true,
                  flexibleSpace: FlexibleSpaceBar(
                    background: coverUrl != null
                        ? CachedNetworkImage(
                            imageUrl: coverUrl,
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
                        Text(
                          detail.title,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          detail.author,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Badges: access-state (Miễn phí/VIP/Đã mua — pick
                        // one) + Mới + category, matching web's priority
                        // order.
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (detail.isFree)
                              const _Badge(
                                label: 'Miễn phí',
                                color: AppColors.success,
                              )
                            else if (isVip)
                              const _Badge(
                                label: 'VIP',
                                color: AppColors.primaryGold,
                                filled: true,
                              )
                            else if (detail.hasPurchased)
                              const _Badge(
                                label: 'Đã mua',
                                color: AppColors.success,
                              ),
                            if (detail.isNewRelease)
                              const _Badge(
                                label: 'Mới',
                                color: AppColors.primaryGold,
                              ),
                            if (detail.category != null)
                              _Badge(
                                label: detail.category!.title,
                                color: AppColors.textSecondary,
                              ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // CTA — single button, unconditional on unlock
                        // state (not gated on hasPurchased alone like
                        // before, which left free/VIP-only readers with no
                        // button at all).
                        SizedBox(
                          width: double.infinity,
                          child: isUnlocked
                              ? ElevatedButton.icon(
                                  icon: const Icon(Icons.menu_book_outlined),
                                  label: Text(
                                    hasStarted ? 'Đọc tiếp' : 'Đọc ngay',
                                  ),
                                  onPressed: detail.chapters.isEmpty
                                      ? null
                                      : () => _openChapter(
                                          context,
                                          detail,
                                          progress?.chapterOrder ?? 1,
                                        ),
                                )
                              : ElevatedButton.icon(
                                  icon: const Icon(Icons.lock_open, size: 18),
                                  label: Text(
                                    'Mở khoá với ${detail.priceLt} LT',
                                  ),
                                  onPressed: state is BookDetailPurchasing
                                      ? null
                                      : () => _showPurchase(context, detail),
                                ),
                        ),

                        const SizedBox(height: 16),

                        // Description
                        if (detail.description != null &&
                            detail.description!.isNotEmpty)
                          _ExpandableDescription(text: detail.description!),

                        const SizedBox(height: 16),

                        // Chapters
                        Text(
                          'Nội dung · ${detail.chapters.length} chương',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...detail.chapters.map(
                          (ch) => _ChapterListItem(
                            chapter: ch,
                            currentPage: progress?.chapterOrder == ch.order
                                ? progress?.currentPage
                                : null,
                            onTap: () =>
                                _openChapter(context, detail, ch.order),
                            onLocked: () => _showPurchase(context, detail),
                          ),
                        ),
                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Refetches on return from the reader — Flutter's Navigator (unlike Vue
  /// Router on web, which remounts a view on every navigation to its path)
  /// keeps this screen's existing widget/bloc when popping back to it, so
  /// without this the CTA label, current-chapter badge and completed
  /// checkmarks would keep showing pre-reading state until the user backs
  /// all the way out and re-enters. Both call sites that push the reader
  /// (the CTA button and each chapter row's onTap) go through this.
  Future<void> _openChapter(
    BuildContext context,
    BookDetail detail,
    int chapterOrder,
  ) async {
    await context.push('/books/${detail.slug}/read?chapter=$chapterOrder');
    if (context.mounted) {
      context.read<BookDetailBloc>().add(
        LoadBookDetail(detail.slug, forceRefresh: true),
      );
    }
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

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  final bool filled;
  const _Badge({required this.label, required this.color, this.filled = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: filled ? color.withOpacity(0.15) : Colors.white.withOpacity(0.07),
        borderRadius: BorderRadius.circular(4),
        border: filled ? Border.all(color: color.withOpacity(0.4)) : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ChapterListItem extends StatelessWidget {
  final BookChapterMeta chapter;

  /// Non-null only when this chapter is where the reader last left off
  /// (progress.chapterOrder == chapter.order) — drives the "Trang X" badge
  /// and the highlighted row, matching web's `.book-detail__chapter-row
  /// --reading`.
  final int? currentPage;
  final VoidCallback onTap;
  final VoidCallback onLocked;

  const _ChapterListItem({
    required this.chapter,
    required this.currentPage,
    required this.onTap,
    required this.onLocked,
  });

  @override
  Widget build(BuildContext context) {
    // Matches web's isCurrentChapter(): unlocked, matches progress, and not
    // already finished — a chapter marked completed shouldn't also read as
    // "currently reading".
    final isCurrent =
        currentPage != null && chapter.canAccess && !chapter.isCompleted;

    return Container(
      decoration: isCurrent
          ? BoxDecoration(
              color: AppColors.primaryGold.withOpacity(0.08),
              border: const Border(
                left: BorderSide(color: AppColors.primaryGold, width: 2),
              ),
            )
          : null,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 4,
        ),
        leading: CircleAvatar(
          backgroundColor: AppColors.surfaceAlt,
          child: Text(
            '${chapter.order}',
            style: TextStyle(
              color: isCurrent
                  ? AppColors.primaryGold
                  : AppColors.primaryGold.withOpacity(0.7),
              fontSize: 13,
            ),
          ),
        ),
        title: Text(
          chapter.title,
          style: TextStyle(
            color: isCurrent ? AppColors.primaryGold : AppColors.textPrimary,
            fontWeight: isCurrent ? FontWeight.w600 : FontWeight.normal,
            fontSize: 14,
          ),
        ),
        subtitle: isCurrent
            ? null
            : Text(
                '${chapter.pageCount} trang',
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (chapter.isDemo)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: AppColors.demoBadge.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'Demo',
                  style: TextStyle(fontSize: 10, color: AppColors.demoBadge),
                ),
              ),
            const SizedBox(width: 4),
            if (isCurrent)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primaryGold.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.menu_book,
                      size: 12,
                      color: AppColors.primaryGold,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Trang $currentPage',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.primaryGold,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              )
            else if (!chapter.canAccess)
              const Icon(Icons.lock_outline, color: AppColors.lockGray)
            else if (chapter.isCompleted)
              const Icon(Icons.check_circle, color: AppColors.success),
          ],
        ),
        onTap: chapter.canAccess ? onTap : onLocked,
      ),
    );
  }
}

class _ExpandableDescription extends StatefulWidget {
  final String text;
  const _ExpandableDescription({required this.text});

  @override
  State<_ExpandableDescription> createState() => _ExpandableDescriptionState();
}

class _ExpandableDescriptionState extends State<_ExpandableDescription> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.text,
          maxLines: _expanded ? null : 4,
          overflow: _expanded ? TextOverflow.visible : TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 14,
            height: 1.5,
          ),
        ),
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              _expanded ? 'Thu gọn' : 'Xem thêm',
              style: const TextStyle(
                color: AppColors.primaryGold,
                fontSize: 13,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
