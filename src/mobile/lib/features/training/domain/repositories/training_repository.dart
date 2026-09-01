import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/training.dart';

abstract class TrainingRepository {
  Future<Either<Failure, TrainingSet>> getTrainingByLesson(
      String lessonSlug);
  Future<Either<Failure, TrainingSet>> getTrainingByChapter(
      String bookSlug, int chapterOrder);
  Future<Either<Failure, List<Flashcard>>> getFlashcards(
      String activityId);
  Future<Either<Failure, Exam>> getExam(String activityId);
}
