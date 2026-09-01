part of 'training_bloc.dart';

abstract class TrainingState extends Equatable {
  const TrainingState();
  @override
  List<Object?> get props => [];
}

class TrainingInitial extends TrainingState {}

class TrainingLoading extends TrainingState {}

class TrainingLoaded extends TrainingState {
  final TrainingSet trainingSet;
  final TrainingActivity? selectedActivity;

  const TrainingLoaded({
    required this.trainingSet,
    required this.selectedActivity,
  });

  TrainingLoaded copyWith({
    TrainingActivity? selectedActivity,
    bool clearActivity = false,
  }) {
    return TrainingLoaded(
      trainingSet: trainingSet,
      selectedActivity:
          clearActivity ? null : (selectedActivity ?? this.selectedActivity),
    );
  }

  @override
  List<Object?> get props => [trainingSet, selectedActivity];
}

class TrainingError extends TrainingState {
  final String message;
  const TrainingError(this.message);
  @override
  List<Object?> get props => [message];
}
