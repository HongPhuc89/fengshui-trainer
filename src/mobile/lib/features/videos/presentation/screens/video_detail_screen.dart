import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../bloc/video_detail_bloc.dart';
import '../../domain/entities/video.dart';

class VideoDetailScreen extends StatelessWidget {
  final String slug;
  const VideoDetailScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          getIt<VideoDetailBloc>()..add(LoadVideoDetail(slug)),
      child: _VideoDetailView(slug: slug),
    );
  }
}

class _VideoDetailView extends StatelessWidget {
  final String slug;
  const _VideoDetailView({required this.slug});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<VideoDetailBloc, VideoDetailState>(
      listener: (context, state) {
        if (state is VideoDetailPurchaseError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is VideoDetailLoading) {
          return const Scaffold(
            body: Center(
                child: CircularProgressIndicator(
                    color: AppColors.primaryGold)),
          );
        }

        if (state is VideoDetailError) {
          return Scaffold(
            appBar: AppBar(),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline,
                      color: AppColors.error, size: 48),
                  const SizedBox(height: 12),
                  Text(state.message),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context
                        .read<VideoDetailBloc>()
                        .add(LoadVideoDetail(slug)),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            ),
          );
        }

        final detail = state is VideoDetailLoaded
            ? state.detail
            : state is VideoDetailPurchasing
                ? state.detail
                : state is VideoDetailPurchaseError
                    ? state.detail
                    : null;

        if (detail == null) return const Scaffold();

        return Scaffold(
          body: CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 220,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  background: detail.thumbnailUrl != null
                      ? CachedNetworkImage(
                          imageUrl: detail.thumbnailUrl!,
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
                      const SizedBox(height: 8),
                      if (detail.category != null)
                        Chip(
                            label: Text(detail.category!.title,
                                style:
                                    const TextStyle(fontSize: 12))),
                      const SizedBox(height: 12),

                      _PriceSection(detail: detail),
                      const SizedBox(height: 16),

                      // Continue watching
                      if (detail.hasPurchased &&
                          detail.lastWatchedLessonSlug != null)
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.play_arrow),
                            label:
                                const Text('Tiếp tục xem'),
                            onPressed: () => context.push(
                                '/videos/${detail.slug}/lessons/${detail.lastWatchedLessonSlug}'),
                          ),
                        ),
                      if (detail.hasPurchased &&
                          detail.lastWatchedLessonSlug == null &&
                          detail.lessons.isNotEmpty)
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.play_arrow),
                            label: const Text('Bắt đầu xem'),
                            onPressed: () => context.push(
                                '/videos/${detail.slug}/lessons/${detail.lessons.first.slug}'),
                          ),
                        ),

                      const SizedBox(height: 16),

                      if (detail.description != null &&
                          detail.description!.isNotEmpty) ...[
                        Text(
                          detail.description!,
                          maxLines: 4,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14,
                              height: 1.5),
                        ),
                        const SizedBox(height: 16),
                      ],

                      const Text(
                        'Danh sách bài học',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ...detail.lessons.map((lesson) =>
                          _LessonListItem(
                            lesson: lesson,
                            courseSlug: detail.slug,
                            hasPurchased: detail.hasPurchased,
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

  void _showPurchase(BuildContext context, VideoDetail detail) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Mua khoá học',
                style: TextStyle(
                    fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Text(detail.title),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Giá',
                    style:
                        TextStyle(color: AppColors.textSecondary)),
                Text('${detail.priceLt} LT',
                    style: const TextStyle(
                        color: AppColors.primaryGold,
                        fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  context
                      .read<VideoDetailBloc>()
                      .add(PurchaseVideo(detail.slug));
                },
                child: const Text('Xác nhận mua'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PriceSection extends StatelessWidget {
  final VideoDetail detail;
  const _PriceSection({required this.detail});

  @override
  Widget build(BuildContext context) {
    if (detail.isVipOnly) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.primaryGold.withOpacity(0.15),
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.diamond, color: AppColors.primaryGold, size: 16),
            SizedBox(width: 6),
            Text('VIP',
                style: TextStyle(color: AppColors.primaryGold)),
          ],
        ),
      );
    }
    if (detail.priceLt == 0) {
      return const Text('Miễn phí',
          style: TextStyle(color: AppColors.success));
    }
    return Row(
      children: [
        const Icon(Icons.diamond_outlined,
            color: AppColors.primaryGold, size: 16),
        const SizedBox(width: 4),
        Text('${detail.priceLt} LT',
            style: const TextStyle(
                color: AppColors.primaryGold,
                fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _LessonListItem extends StatelessWidget {
  final LessonMeta lesson;
  final String courseSlug;
  final bool hasPurchased;
  final VoidCallback onLocked;

  const _LessonListItem({
    required this.lesson,
    required this.courseSlug,
    required this.hasPurchased,
    required this.onLocked,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 0, vertical: 2),
      leading: CircleAvatar(
        backgroundColor: AppColors.surfaceAlt,
        child: Text('${lesson.order}',
            style: const TextStyle(
                color: AppColors.primaryGold, fontSize: 13)),
      ),
      title: Text(lesson.title,
          style: const TextStyle(
              color: AppColors.textPrimary, fontSize: 14)),
      subtitle: Text(lesson.durationLabel,
          style: const TextStyle(
              color: AppColors.textSecondary, fontSize: 12)),
      trailing: lesson.canAccess
          ? (lesson.isCompleted
              ? const Icon(Icons.check_circle,
                  color: AppColors.success)
              : const Icon(Icons.play_circle_outline,
                  color: AppColors.primaryGold))
          : const Icon(Icons.lock_outline,
              color: AppColors.lockGray),
      onTap: () {
        if (lesson.canAccess) {
          context.push(
              '/videos/$courseSlug/lessons/${lesson.slug}');
        } else {
          onLocked();
        }
      },
    );
  }
}
