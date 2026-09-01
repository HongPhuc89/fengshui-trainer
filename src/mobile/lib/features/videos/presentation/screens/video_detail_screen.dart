import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../bloc/video_detail_bloc.dart';
import '../widgets/lesson_list_item.dart';
import '../../domain/entities/video.dart';
import '../../domain/repositories/videos_repository.dart';

/// 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' → Vietnamese label + accent
/// color — mirrors web's LEVEL_MAP in VideoDetailView.vue.
const Map<String, ({String label, Color color})> _kLevelMap = {
  'BEGINNER': (label: 'Cơ bản', color: Color(0xFF66BB6A)),
  'INTERMEDIATE': (label: 'Trung cấp', color: Color(0xFFFFA726)),
  'ADVANCED': (label: 'Nâng cao', color: Color(0xFFEF5350)),
};

({String label, Color color}) _levelInfo(String level) =>
    _kLevelMap[level] ?? (label: level, color: AppColors.textSecondary);

/// Matches web's formatDuration() in VideoDetailView.vue.
String _formatDuration(int seconds) {
  if (seconds <= 0) return '';
  final h = seconds ~/ 3600;
  final m = (seconds % 3600) ~/ 60;
  return h > 0 ? '${h}g ${m}p' : '$m phút';
}

class VideoDetailScreen extends StatelessWidget {
  final String slug;
  const VideoDetailScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<VideoDetailBloc>()..add(LoadVideoDetail(slug)),
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
              child: CircularProgressIndicator(color: AppColors.primaryGold),
            ),
          );
        }

        if (state is VideoDetailError) {
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
                  Text(state.message),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.read<VideoDetailBloc>().add(
                      LoadVideoDetail(slug),
                    ),
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
        final progress = state is VideoDetailLoaded
            ? state.progress
            : state is VideoDetailPurchasing
            ? state.progress
            : state is VideoDetailPurchaseError
            ? state.progress
            : null;

        if (detail == null) return const Scaffold();

        // Whole-course access (free/VIP/purchased) — matches web's
        // `canAccess` computed, but derived from server-computed per-lesson
        // `can_access` (VideoLessonListSerializer) instead of re-deriving
        // VIP/purchase logic client-side: `hasPurchased` alone doesn't
        // account for VIP (UserVideoPurchase lookup only), and VideoDetail
        // has no `is_free`/VIP-of-current-user field to check directly.
        // Design doc (§4.5) didn't pin down the exact formula — this is the
        // implementation choice, using data already correct on the wire.
        final canAccess =
            detail.hasPurchased ||
            (detail.lessons.isNotEmpty &&
                detail.lessons.every((l) => l.canAccess));

        return Scaffold(
          body: RefreshIndicator(
            color: AppColors.primaryGold,
            onRefresh: () async => context.read<VideoDetailBloc>().add(
              LoadVideoDetail(slug, forceRefresh: true),
            ),
            // Without this, pull-to-refresh silently does nothing whenever
            // the lesson list is short enough to fit on screen (no
            // overscroll possible without it).
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // No hero-image banner — matches web (VideoDetailView.vue
                // dropped its cover-image banner too), a simple back-link
                // instead of the SliverAppBar this screen had before.
                SliverSafeArea(
                  bottom: false,
                  sliver: SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
                      child: InkWell(
                        onTap: () => context.pop(),
                        borderRadius: BorderRadius.circular(6),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 8,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.chevron_left,
                                color: AppColors.primaryGold,
                                size: 22,
                              ),
                              Text(
                                'Khóa học',
                                style: TextStyle(
                                  color: AppColors.primaryGold,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          detail.title,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 4),
                        if (detail.instructor != null &&
                            detail.instructor!.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Row(
                              children: [
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF7C4DFF),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  detail.instructor!,
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        const SizedBox(height: 10),

                        // Tags: level badge, lesson count, total duration.
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            if (detail.level != null &&
                                detail.level!.isNotEmpty)
                              _LevelBadge(level: detail.level!),
                            if (detail.totalLessons > 0)
                              _InfoTag(
                                icon: Icons.smart_display_outlined,
                                label: '${detail.totalLessons} bài học',
                              ),
                            if (detail.totalDurationSeconds > 0)
                              _InfoTag(
                                icon: Icons.access_time,
                                label: _formatDuration(
                                  detail.totalDurationSeconds,
                                ),
                              ),
                          ],
                        ),

                        // Progress bar — only once the user has completed
                        // at least one lesson, matches web.
                        if (progress != null && progress.completedLessons > 0)
                          Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: Row(
                              children: [
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(3),
                                    child: LinearProgressIndicator(
                                      value: progress.progressPercent / 100,
                                      minHeight: 6,
                                      backgroundColor: Colors.white10,
                                      valueColor:
                                          const AlwaysStoppedAnimation(
                                        AppColors.primaryGold,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${progress.completedLessons}/${progress.totalLessons} bài · ${progress.progressPercent}%',
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),

                        const SizedBox(height: 16),

                        // CTA — single button: continue/start when
                        // accessible, else buy. Matches web (no separate
                        // always-visible price box once purchased).
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: canAccess
                              ? ElevatedButton.icon(
                                  icon: const Icon(Icons.play_arrow),
                                  // Matches web: label is driven by
                                  // completedLessons, NOT by a
                                  // last-watched-lesson field — the course
                                  // detail response never carries one (see
                                  // _startOrContinue below).
                                  label: Text(
                                    progress != null &&
                                            progress.completedLessons > 0
                                        ? 'Tiếp tục học'
                                        : 'Bắt đầu học',
                                  ),
                                  onPressed: detail.lessons.isEmpty
                                      ? null
                                      : () => _startOrContinue(
                                          context,
                                          detail,
                                        ),
                                )
                              : ElevatedButton.icon(
                                  icon: const Icon(Icons.lock_open, size: 18),
                                  label: Text(
                                    'Mở khoá với ${detail.priceLt} LT',
                                  ),
                                  onPressed: state is VideoDetailPurchasing
                                      ? null
                                      : () => _showPurchase(context, detail),
                                ),
                        ),

                        const SizedBox(height: 16),

                        if (detail.description != null &&
                            detail.description!.isNotEmpty)
                          _DescriptionSection(text: detail.description!),

                        const SizedBox(height: 16),
                        const Text(
                          'Danh sách bài học',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...detail.lessons.map(
                          (lesson) => LessonListItem(
                            lesson: lesson,
                            onTap: () =>
                                _openLesson(context, detail.slug, lesson.slug),
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

  /// Mirrors web's startOrContinue(): fetches the last-watched lesson's
  /// order lazily, right when the CTA is tapped — NOT preloaded with the
  /// course detail, matching how web only calls getLastLesson() on click.
  /// Falls back to the first lesson on any failure or when the order
  /// doesn't match anything in `lessons` (stale data, edge case).
  Future<void> _startOrContinue(
    BuildContext context,
    VideoDetail detail,
  ) async {
    // Direct repository call, not routed through VideoDetailBloc — this is
    // a one-off lookup with no effect on VideoDetailState, so mediating it
    // through an event/state round-trip would add ceremony for nothing.
    final result = await getIt<VideosRepository>().getLastLessonOrder(
      detail.slug,
    );
    final order = result.fold((_) => null, (o) => o);
    final lesson = detail.lessons
        .cast<LessonMeta?>()
        .firstWhere((l) => l?.order == order, orElse: () => null);
    if (!context.mounted) return;
    await _openLesson(
      context,
      detail.slug,
      (lesson ?? detail.lessons.first).slug,
    );
  }

  /// Refetches on return from the player — Flutter's Navigator (unlike Vue
  /// Router on web, which remounts a view on every navigation to its path)
  /// keeps this screen's existing widget/bloc when popping back to it, so
  /// without this the CTA and lesson list would keep showing pre-playback
  /// state (no "Tiếp tục học", no completed checkmark) until the user backs
  /// all the way out and re-enters. forceRefresh bypasses the cache, which
  /// setLastLesson/saveLessonProgress already invalidated server-side.
  Future<void> _openLesson(
    BuildContext context,
    String courseSlug,
    String lessonSlug,
  ) async {
    await context.push('/videos/$courseSlug/lessons/$lessonSlug');
    if (context.mounted) {
      context.read<VideoDetailBloc>().add(
        LoadVideoDetail(courseSlug, forceRefresh: true),
      );
    }
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
            const Text(
              'Mua khoá học',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Text(detail.title),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Giá',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
                Text(
                  '${detail.priceLt} LT',
                  style: const TextStyle(
                    color: AppColors.primaryGold,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  context.read<VideoDetailBloc>().add(
                    PurchaseVideo(detail.slug),
                  );
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

class _LevelBadge extends StatelessWidget {
  final String level;
  const _LevelBadge({required this.level});

  @override
  Widget build(BuildContext context) {
    final info = _levelInfo(level);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        border: Border.all(color: info.color.withOpacity(0.2)),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        info.label,
        style: TextStyle(
          color: info.color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _InfoTag extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoTag({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.07),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: AppColors.textSecondary),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

/// Description clamped to 3 lines with a "Xem thêm"/"Thu gọn" toggle —
/// matches web's .vd__desc-wrap. Local state only, no need to lift this to
/// the bloc.
class _DescriptionSection extends StatefulWidget {
  final String text;
  const _DescriptionSection({required this.text});

  @override
  State<_DescriptionSection> createState() => _DescriptionSectionState();
}

class _DescriptionSectionState extends State<_DescriptionSection> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.text,
            maxLines: _expanded ? null : 3,
            overflow: _expanded ? null : TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          TextButton(
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(0, 28),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              alignment: Alignment.centerLeft,
            ),
            onPressed: () => setState(() => _expanded = !_expanded),
            child: Text(
              _expanded ? 'Thu gọn' : 'Xem thêm',
              style: const TextStyle(
                color: AppColors.primaryGold,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
