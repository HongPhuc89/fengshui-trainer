part of 'training_bloc.dart';

abstract class TrainingEvent extends Equatable {
  const TrainingEvent();
  @override
  List<Object?> get props => [];
}

class LoadTrainingByLesson extends TrainingEvent {
  final String lessonSlug;
  const LoadTrainingByLesson(this.lessonSlug);
  @override
  List<Object?> get props => [lessonSlug];
}

class LoadTrainingByChapter extends TrainingEvent {
  final String bookSlug;
  final int chapterOrder;
  const LoadTrainingByChapter(this.bookSlug, this.chapterOrder);
  @override
  List<Object?> get props => [bookSlug, chapterOrder];
}

class SelectActivity extends TrainingEvent {
  final TrainingActivity activity;
  const SelectActivity(this.activity);
  @override
  List<Object?> get props => [activity];
}

class BackToSelector extends TrainingEvent {
  const BackToSelector();
}
