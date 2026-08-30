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

  const VideoPlayerLoaded({
    required this.courseSlug,
    required this.lesson,
  });

  @override
  List<Object?> get props => [courseSlug, lesson];
}

class VideoPlayerError extends VideoPlayerState {
  final String message;
  const VideoPlayerError(this.message);
  @override
  List<Object?> get props => [message];
}
