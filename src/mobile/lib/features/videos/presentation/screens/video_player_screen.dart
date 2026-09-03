import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';

import '../../../../core/observability/sentry_log_service.dart';
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

class _VideoPlayerScreenState extends State<VideoPlayerScreen>
    with WidgetsBindingObserver {
  late final VideoPlayerBloc _bloc;
  VideoPlayerController? _videoController;
  ChewieController? _chewieController;
  int _selectedTab = 0;
  LessonContent? _currentLesson;

  // Set when VideoPlayerController.initialize() throws. Chewie's own
  // _initialize() calls the same method without a try/catch and without
  // awaiting it from a caller that can catch it, so an unreachable CDN
  // (blocked DNS, dropped connection) would otherwise surface only as an
  // unhandled PlatformException in PlatformDispatcher.onError — no on-screen
  // feedback, no retry. Initializing here first intercepts that failure.
  String? _playerError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
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
    WidgetsBinding.instance.removeObserver(this);
    _chewieController?.dispose();
    _videoController?.dispose();
    _bloc.close();
    ScreenGuard.allowDataLeakage();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // ExoPlayer otherwise keeps buffering/decoding the network stream while
    // the app is backgrounded; a connectivity hiccup in that state threw an
    // unhandled PlatformException(VideoError, ... Source error) straight to
    // PlatformDispatcher.onError (Sentry FENGSHUI-TRAINER-MOBILE-1). Pausing
    // on background avoids feeding the player a source error nobody can see.
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _videoController?.pause();
    }
  }

  Future<void> _initVideo(LessonContent lesson) async {
    _currentLesson = lesson;
    _chewieController?.dispose();
    _videoController?.dispose();
    _chewieController = null;
    _videoController = null;
    setState(() => _playerError = null);

    // Prefer the HLS playlist: videoUrl is a Bunny iframe embed *page*, which
    // ExoPlayer/AVPlayer cannot decode. The headers carry the Referer the pull
    // zone requires — without it Bunny answers 403.
    final source = lesson.hlsUrl ?? lesson.videoUrl;
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(source),
      httpHeaders: lesson.hlsHeaders,
    );

    try {
      // Initialize explicitly, outside Chewie: ChewieController's own
      // _initialize() awaits this same call from its constructor with no
      // try/catch and no caller able to await it, so a network failure here
      // (blocked/unreachable CDN) would otherwise become an unhandled
      // PlatformException instead of on-screen feedback.
      await controller.initialize();
    } catch (e) {
      controller.dispose();
      SentryLogService.trackVideoLoadError(
        widget.courseSlug,
        lesson.slug,
        e.toString(),
      );
      if (!mounted || _currentLesson != lesson) return;
      setState(() {
        _playerError =
            'Không thể tải video. Vui lòng kiểm tra kết nối mạng, '
            'thử đổi sang mạng khác (WiFi/4G) hoặc bật VPN rồi thử lại.';
      });
      return;
    }
    if (!mounted || _currentLesson != lesson) {
      controller.dispose();
      return;
    }

    _videoController = controller;
    _chewieController = ChewieController(
      videoPlayerController: controller,
      autoInitialize: true,
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

    // Save progress every 5 seconds; also surface playback-time errors.
    // initialize()'s try/catch above only covers the initial load — once
    // playback has started, a later native error (e.g. a dropped CDN
    // connection) instead lands here as controller.value.hasError, and was
    // previously silently ignored, leaving a frozen player with no feedback
    // (Sentry FENGSHUI-TRAINER-MOBILE-1).
    controller.addListener(() {
      if (!mounted || _currentLesson != lesson) return;
      if (controller.value.hasError) {
        if (_playerError == null) {
          SentryLogService.trackVideoLoadError(
            widget.courseSlug,
            lesson.slug,
            controller.value.errorDescription ?? 'playback error',
          );
          setState(() {
            _playerError =
                'Video bị gián đoạn. Vui lòng kiểm tra kết nối mạng rồi '
                'thử lại.';
          });
        }
        return;
      }
      final pos = controller.value.position;
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
                      // Error takes priority over an already-initialized
                      // Chewie: a playback-time error (set via the
                      // controller listener above) can fire after
                      // _chewieController is no longer null, and must still
                      // replace the (now broken) player view.
                      child: _playerError != null
                          ? Container(
                              color: Colors.black,
                              child: Center(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(
                                        Icons.error_outline,
                                        color: AppColors.error,
                                        size: 40,
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        _playerError!,
                                        style: const TextStyle(
                                          color: Colors.white70,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                      const SizedBox(height: 16),
                                      ElevatedButton(
                                        onPressed: () {
                                          final lesson = _currentLesson;
                                          if (lesson != null) {
                                            _initVideo(lesson);
                                          }
                                        },
                                        child: const Text('Thử lại'),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            )
                          : _chewieController != null
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
        // `LessonListItem`'s own contentPadding is horizontal:0 — correct
        // for video_detail_screen.dart, which already wraps its lesson list
        // in a 16px page Padding, but this tab content has no outer padding
        // of its own, so the horizontal margin has to be added here instead
        // (adding it to the shared widget would double up on the other screen).
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: Colors.white12)),
      ),
      child: SafeArea(
        top: false,
        // `minimum` guarantees clearance even when the OS under-reports the
        // bottom inset — same gesture-nav quirk fixed in the PDF reader's
        // bottom bar (feature-39): plain SafeArea measured 0 there, leaving
        // these buttons flush against the gesture strip.
        minimum: const EdgeInsets.only(bottom: 12),
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
