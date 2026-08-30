import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../domain/entities/video.dart';
import '../../domain/repositories/videos_repository.dart';

part 'video_player_event.dart';
part 'video_player_state.dart';

@injectable
class VideoPlayerBloc
    extends Bloc<VideoPlayerEvent, VideoPlayerState> {
  final VideosRepository _repository;
  Timer? _progressTimer;

  VideoPlayerBloc(this._repository) : super(VideoPlayerInitial()) {
    on<LoadLesson>(_onLoadLesson);
    on<SaveProgress>(_onSaveProgress);
    on<LessonCompleted>(_onLessonCompleted);
  }

  Future<void> _onLoadLesson(
      LoadLesson event, Emitter<VideoPlayerState> emit) async {
    emit(VideoPlayerLoading());
    final result = await _repository.getLesson(
        event.courseSlug, event.lessonSlug);
    result.fold(
      (failure) => emit(VideoPlayerError(failure.message)),
      (lesson) => emit(VideoPlayerLoaded(
        courseSlug: event.courseSlug,
        lesson: lesson,
      )),
    );
  }

  Future<void> _onSaveProgress(
      SaveProgress event, Emitter<VideoPlayerState> emit) async {
    final s = state;
    if (s is! VideoPlayerLoaded) return;
    _progressTimer?.cancel();
    _progressTimer = Timer(const Duration(seconds: 2), () {
      _repository.saveLessonProgress(
          s.courseSlug, s.lesson.slug, event.seconds);
    });
  }

  Future<void> _onLessonCompleted(
      LessonCompleted event, Emitter<VideoPlayerState> emit) async {
    final s = state;
    if (s is! VideoPlayerLoaded) return;
    await _repository.saveLessonProgress(
        s.courseSlug, s.lesson.slug, s.lesson.durationSeconds);
  }

  @override
  Future<void> close() {
    _progressTimer?.cancel();
    return super.close();
  }
}
