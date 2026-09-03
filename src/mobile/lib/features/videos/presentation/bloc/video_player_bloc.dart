import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/observability/sentry_log_service.dart';
import '../../domain/entities/video.dart';
import '../../domain/repositories/videos_repository.dart';

part 'video_player_event.dart';
part 'video_player_state.dart';

@injectable
class VideoPlayerBloc extends Bloc<VideoPlayerEvent, VideoPlayerState> {
  final VideosRepository _repository;
  Timer? _progressTimer;

  VideoPlayerBloc(this._repository) : super(VideoPlayerInitial()) {
    on<LoadLesson>(_onLoadLesson);
    on<SaveProgress>(_onSaveProgress);
    on<LessonCompleted>(_onLessonCompleted);
  }

  Future<void> _onLoadLesson(
    LoadLesson event,
    Emitter<VideoPlayerState> emit,
  ) async {
    emit(VideoPlayerLoading());

    // Fired together, not awaited in sequence, so the course fetch (for the
    // lesson list / prev-next bar) does not add its own round trip on top of
    // the video's — mirrors the web player's Promise.allSettled for the same
    // two calls.
    final lessonFuture = _repository.getLesson(
      event.courseSlug,
      event.lessonSlug,
    );
    final detailFuture = _repository.getVideoDetail(event.courseSlug);
    final lessonResult = await lessonFuture;
    final detailResult = await detailFuture;

    lessonResult.fold(
      (failure) {
        SentryLogService.trackVideoLoadError(
          event.courseSlug,
          event.lessonSlug,
          failure.message,
        );
        emit(VideoPlayerError(failure.message));
      },
      (lesson) {
        // Fire-and-forget, matches web's setLastLesson(...).catch(() => {})
        // in VideoPlayerView.vue — must not block/delay playback, and a
        // failure here only means the course-detail CTA and Home's
        // "continue watching" card stay a step behind, not a real error.
        _repository.setLastLesson(event.courseSlug, event.lessonSlug);
        SentryLogService.trackVideoLoad(event.courseSlug, event.lessonSlug);
        emit(
          VideoPlayerLoaded(
            courseSlug: event.courseSlug,
            lesson: lesson,
            // A failed course fetch must not block playback of a lesson
            // that loaded fine — it only costs the sidebar list.
            lessons: detailResult.fold((_) => const [], (d) => d.lessons),
          ),
        );
      },
    );
  }

  Future<void> _onSaveProgress(
    SaveProgress event,
    Emitter<VideoPlayerState> emit,
  ) async {
    final s = state;
    if (s is! VideoPlayerLoaded) return;
    _progressTimer?.cancel();
    _progressTimer = Timer(const Duration(seconds: 2), () {
      _repository.saveLessonProgress(
        s.courseSlug,
        s.lesson.slug,
        event.seconds,
      );
    });
  }

  Future<void> _onLessonCompleted(
    LessonCompleted event,
    Emitter<VideoPlayerState> emit,
  ) async {
    final s = state;
    if (s is! VideoPlayerLoaded) return;
    await _repository.saveLessonProgress(
      s.courseSlug,
      s.lesson.slug,
      s.lesson.durationSeconds,
    );
  }

  @override
  Future<void> close() {
    _progressTimer?.cancel();
    return super.close();
  }
}
