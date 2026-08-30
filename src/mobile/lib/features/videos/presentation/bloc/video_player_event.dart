part of 'video_player_bloc.dart';

abstract class VideoPlayerEvent extends Equatable {
  const VideoPlayerEvent();
  @override
  List<Object?> get props => [];
}

class LoadLesson extends VideoPlayerEvent {
  final String courseSlug;
  final String lessonSlug;
  const LoadLesson({required this.courseSlug, required this.lessonSlug});
  @override
  List<Object?> get props => [courseSlug, lessonSlug];
}

class SaveProgress extends VideoPlayerEvent {
  final int seconds;
  const SaveProgress(this.seconds);
  @override
  List<Object?> get props => [seconds];
}

class LessonCompleted extends VideoPlayerEvent {
  const LessonCompleted();
}
