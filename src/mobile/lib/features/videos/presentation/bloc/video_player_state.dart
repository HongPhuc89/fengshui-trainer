part of 'video_player_bloc.dart';

abstract class VideoPlayerState extends Equatable {
  const VideoPlayerState();
  @override
  List<Object?> get props => [];
}

class VideoPlayerInitial extends VideoPlayerState {}

class VideoPlayerLoading extends VideoPlayerState {}

class VideoPlayerLoaded extends VideoPlayerState {
  final String courseSlug;
  final LessonContent lesson;

  /// The rest of the course, for the lesson list / prev-next bar. Empty when
  /// the course fetch failed — playback itself must not be blocked by that,
  /// so it degrades to "no sidebar" rather than an error screen.
  final List<LessonMeta> lessons;

  const VideoPlayerLoaded({
    required this.courseSlug,
    required this.lesson,
    this.lessons = const [],
  });

  List<LessonMeta> get sortedLessons =>
      [...lessons]..sort((a, b) => a.order.compareTo(b.order));

  int get _currentIndex =>
      sortedLessons.indexWhere((l) => l.slug == lesson.slug);

  LessonMeta? get prevLesson {
    final i = _currentIndex;
    return i > 0 ? sortedLessons[i - 1] : null;
  }

  LessonMeta? get nextLesson {
    final i = _currentIndex;
    return i >= 0 && i < sortedLessons.length - 1 ? sortedLessons[i + 1] : null;
  }

  @override
  List<Object?> get props => [courseSlug, lesson, lessons];
}

class VideoPlayerError extends VideoPlayerState {
  final String message;
  const VideoPlayerError(this.message);
  @override
  List<Object?> get props => [message];
}
