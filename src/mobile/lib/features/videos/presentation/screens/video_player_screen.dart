import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';

import '../../../../core/security/screen_guard.dart';
import '../../../../../core/auth/auth_cubit.dart';
import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../bloc/video_player_bloc.dart';
import '../widgets/lesson_list_item.dart';
import '../widgets/video_watermark_overlay.dart';
import '../../domain/entities/video.dart';

class VideoPlayerScreen extends StatefulWidget {
  final String courseSlug;
  final String lessonSlug;

  const VideoPlayerScreen({
    super.key,
    required this.courseSlug,
    required this.lessonSlug,
  });

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  late final VideoPlayerBloc _bloc;
  VideoPlayerController? _videoController;
  ChewieController? _chewieController;
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    ScreenGuard.preventCapture();
    ScreenGuard.protectDataLeakage();
    _bloc = getIt<VideoPlayerBloc>()
      ..add(
        LoadLesson(
          courseSlug: widget.courseSlug,
          lessonSlug: widget.lessonSlug,
        ),
      );
  }

  @override
  void dispose() {
    _chewieController?.dispose();
    _videoController?.dispose();
    _bloc.close();
    ScreenGuard.allowDataLeakage();
    super.dispose();
  }

  void _initVideo(LessonContent lesson) {
    _videoController?.dispose();
    _chewieController?.dispose();

    // Prefer the HLS playlist: videoUrl is a Bunny iframe embed *page*, which
    // ExoPlayer/AVPlayer cannot decode. The headers carry the Referer the pull
    // zone requires — without it Bunny answers 403.
    final source = lesson.hlsUrl ?? lesson.videoUrl;
    _videoController = VideoPlayerController.networkUrl(
      Uri.parse(source),
      httpHeaders: lesson.hlsHeaders,
    );

    _chewieController = ChewieController(
      videoPlayerController: _videoController!,
      autoPlay: true,
      looping: false,
      allowFullScreen: true,
      // Without this, Chewie falls back to videoPlayerController.value's
      // default aspectRatio (1.0, i.e. square) for the moment between
      // Chewie showing up and the network video's real metadata arriving —
      // visible every time _initVideo runs again from switching lessons.
      aspectRatio: 16 / 9,
      materialProgressColors: ChewieProgressColors(
        playedColor: AppColors.primaryGold,
        handleColor: AppColors.primaryGold,
        backgroundColor: Colors.white24,
        bufferedColor: Colors.white38,
      ),
    );

    // Save progress every 5 seconds
    _videoController!.addListener(() {
      final pos = _videoController!.value.position;
      if (pos.inSeconds % 5 == 0 && pos.inSeconds > 0) {
        _bloc.add(SaveProgress(pos.inSeconds));
      }
    });

    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final user = getIt<AuthCubit>().currentUser;

    return BlocProvider.value(
      value: _bloc,
      child: BlocConsumer<VideoPlayerBloc, VideoPlayerState>(
        listener: (context, state) {
          if (state is VideoPlayerLoaded) {
            _initVideo(state.lesson);
          }
        },
        builder: (context, state) {
          return Scaffold(
            appBar: AppBar(
              title: state is VideoPlayerLoaded
                  ? Text(
                      '${state.lesson.order}. ${state.lesson.title}',
                      style: const TextStyle(fontSize: 15),
                    )
                  : const Text('Đang tải...'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.pop(),
              ),
            ),
            body: Column(
              children: [
                // Video area (16:9)
                Stack(
                  children: [
                    AspectRatio(
                      aspectRatio: 16 / 9,
                      child: _chewieController != null
                          ? Chewie(controller: _chewieController!)
                          : Container(
                              color: Colors.black,
                              child: state is VideoPlayerLoading
                                  ? const Center(
                                      child: CircularProgressIndicator(
                                        color: AppColors.primaryGold,
                                      ),
                                    )
                                  : state is VideoPlayerError
                                  ? Center(
                                      child: Text(
                                        (state as VideoPlayerError).message,
                                        style: const TextStyle(
                                          color: Colors.white70,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                    )
                                  : const SizedBox.shrink(),
                            ),
                    ),
                    // Floating watermark overlay
                    if (user != null) VideoWatermarkOverlay(text: user.email),
                  ],
                ),

                // Tab bar
                if (state is VideoPlayerLoaded) _buildTabBar(state.lesson),

                // Tab content
                Expanded(
                  child: state is VideoPlayerLoaded
                      ? _buildTabContent(context, state)
                      : const SizedBox.shrink(),
                ),

                // Prev/next — always visible once loaded, independent of
                // which tab is active (matches the web player).
                if (state is VideoPlayerLoaded) _buildLessonNav(context, state),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildTabBar(LessonContent lesson) {
    final tabs = ['Bài học'];
    if (lesson.hasTrainingSet) {
      tabs.add('Luyện tập');
    }

    return Container(
      color: AppColors.surface,
      child: Row(
        children: tabs.asMap().entries.map((entry) {
          final i = entry.key;
          final label = entry.value;
          final isSelected = _selectedTab == i;
          return GestureDetector(
            onTap: () => setState(() => _selectedTab = i),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isSelected
                        ? AppColors.primaryGold
                        : Colors.transparent,
                    width: 2,
                  ),
                ),
              ),
              child: Text(
                label,
                style: TextStyle(
                  color: isSelected
                      ? AppColors.primaryGold
                      : AppColors.textSecondary,
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTabContent(BuildContext context, VideoPlayerLoaded state) {
    final lesson = state.lesson;
    if (_selectedTab == 0) {
      // Lesson list — every lesson in the course, current one highlighted
      // and auto-tappable to switch (mirrors the web player's sidebar).
      if (state.sortedLessons.isEmpty) {
        // Course fetch failed (or came back empty) — degrade to just the
        // current lesson's own info rather than an empty tab.
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                lesson.title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${lesson.durationSeconds ~/ 60} phút',
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        );
      }
      return ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 4),
        itemCount: state.sortedLessons.length,
        itemBuilder: (_, i) {
          final l = state.sortedLessons[i];
          return LessonListItem(
            lesson: l,
            isActive: l.slug == lesson.slug,
            onTap: () => _goToLesson(context, state.courseSlug, l),
            onLocked: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Cần nâng cấp VIP hoặc mua khoá học để xem bài này.',
                ),
              ),
            ),
          );
        },
      );
    }

    // Training tab
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.school_outlined,
            color: AppColors.primaryGold,
            size: 48,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => context.push('/training/lesson/${lesson.slug}'),
            child: const Text('Bắt đầu luyện tập'),
          ),
        ],
      ),
    );
  }

  /// Replace, not push: switching lessons from the list/prev-next bar is a
  /// lateral move within the same player, not a drill-down. Pushing would
  /// stack one route per lesson tapped, and back would step through all of
  /// them instead of leaving the player.
  void _goToLesson(BuildContext context, String courseSlug, LessonMeta lesson) {
    if (lesson.slug == widget.lessonSlug) return;
    context.pushReplacement('/videos/$courseSlug/lessons/${lesson.slug}');
  }

  Widget _buildLessonNav(BuildContext context, VideoPlayerLoaded state) {
    if (state.prevLesson == null && state.nextLesson == null) {
      return const SizedBox.shrink();
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: Colors.white12)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: state.prevLesson != null
                    ? () => _goToLesson(
                        context,
                        state.courseSlug,
                        state.prevLesson!,
                      )
                    : null,
                icon: const Icon(Icons.chevron_left, size: 18),
                label: const Text('Bài trước'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: state.nextLesson != null
                    ? () => _goToLesson(
                        context,
                        state.courseSlug,
                        state.nextLesson!,
                      )
                    : null,
                icon: const Icon(Icons.chevron_right, size: 18),
                label: const Text('Bài tiếp'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
