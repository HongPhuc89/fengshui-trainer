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
      ..add(LoadLesson(
        courseSlug: widget.courseSlug,
        lessonSlug: widget.lessonSlug,
      ));
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
                  ? Text(state.lesson.title,
                      style: const TextStyle(fontSize: 15))
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
                                          color: AppColors.primaryGold),
                                    )
                                  : state is VideoPlayerError
                                      ? Center(
                                          child: Text(
                                            (state as VideoPlayerError)
                                                .message,
                                            style: const TextStyle(
                                                color: Colors.white70),
                                            textAlign: TextAlign.center,
                                          ),
                                        )
                                      : const SizedBox.shrink(),
                            ),
                    ),
                    // Floating watermark overlay
                    if (user != null)
                      VideoWatermarkOverlay(
                          text: user.email),
                  ],
                ),

                // Tab bar
                if (state is VideoPlayerLoaded)
                  _buildTabBar(state.lesson),

                // Tab content
                Expanded(
                  child: state is VideoPlayerLoaded
                      ? _buildTabContent(context, state.lesson)
                      : const SizedBox.shrink(),
                ),
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
              padding: const EdgeInsets.symmetric(
                  horizontal: 20, vertical: 12),
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
                  fontWeight: isSelected
                      ? FontWeight.w600
                      : FontWeight.normal,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTabContent(
      BuildContext context, LessonContent lesson) {
    if (_selectedTab == 0) {
      // Lesson info tab
      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(lesson.title,
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 8),
            Text(
              '${lesson.durationSeconds ~/ 60} phút',
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 13),
            ),
            if (lesson.hasTrainingSet) ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                icon: const Icon(Icons.school_outlined),
                label: const Text('Luyện tập bài này'),
                onPressed: () => context.push(
                    '/training/lesson/${lesson.slug}'),
              ),
            ],
          ],
        ),
      );
    }

    // Training tab
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.school_outlined,
              color: AppColors.primaryGold, size: 48),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () =>
                context.push('/training/lesson/${lesson.slug}'),
            child: const Text('Bắt đầu luyện tập'),
          ),
        ],
      ),
    );
  }
}
