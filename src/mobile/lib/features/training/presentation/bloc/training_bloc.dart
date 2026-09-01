import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../domain/entities/training.dart';
import '../../domain/repositories/training_repository.dart';

part 'training_event.dart';
part 'training_state.dart';

@injectable
class TrainingBloc extends Bloc<TrainingEvent, TrainingState> {
  final TrainingRepository _repository;

  TrainingBloc(this._repository) : super(TrainingInitial()) {
    on<LoadTrainingByLesson>(_onLoadByLesson);
    on<LoadTrainingByChapter>(_onLoadByChapter);
    on<SelectActivity>(_onSelectActivity);
    on<BackToSelector>(_onBackToSelector);
  }

  Future<void> _onLoadByLesson(
      LoadTrainingByLesson event, Emitter<TrainingState> emit) async {
    emit(TrainingLoading());
    final result =
        await _repository.getTrainingByLesson(event.lessonSlug);
    result.fold(
      (failure) => emit(TrainingError(failure.message)),
      (ts) => emit(TrainingLoaded(
        trainingSet: ts,
        selectedActivity: null,
      )),
    );
  }

  Future<void> _onLoadByChapter(
      LoadTrainingByChapter event,
      Emitter<TrainingState> emit) async {
    emit(TrainingLoading());
    final result = await _repository.getTrainingByChapter(
        event.bookSlug, event.chapterOrder);
    result.fold(
      (failure) => emit(TrainingError(failure.message)),
      (ts) => emit(TrainingLoaded(
        trainingSet: ts,
        selectedActivity: null,
      )),
    );
  }

  void _onSelectActivity(
      SelectActivity event, Emitter<TrainingState> emit) {
    final s = state;
    if (s is TrainingLoaded) {
      emit(s.copyWith(selectedActivity: event.activity));
    }
  }

  void _onBackToSelector(
      BackToSelector event, Emitter<TrainingState> emit) {
    final s = state;
    if (s is TrainingLoaded) {
      emit(s.copyWith(clearActivity: true));
    }
  }
}
