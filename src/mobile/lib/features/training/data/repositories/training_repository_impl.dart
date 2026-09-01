import 'package:flutter/foundation.dart';
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/cache/cache_service.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/constants.dart';
import '../../domain/entities/training.dart';
import '../../domain/repositories/training_repository.dart';
import '../datasources/training_remote_datasource.dart';
import '../models/training_model.dart';

@Injectable(as: TrainingRepository)
class TrainingRepositoryImpl implements TrainingRepository {
  final TrainingRemoteDataSource _remote;
  final CacheService _cache;

  TrainingRepositoryImpl(this._remote, this._cache);

  @override
  Future<Either<Failure, TrainingSet>> getTrainingByLesson(
      String lessonSlug) async {
    try {
      final cacheKey = CacheKeys.trainingByLesson(lessonSlug);
      final cached =
          await _cache.get<Map<String, dynamic>>(cacheKey);
      if (cached != null) {
        return Right(TrainingSetModel.fromJson(cached));
      }

      final data = await _remote.getTrainingByLesson(lessonSlug);
      await _cache.set(
          cacheKey, _trainingSetToJson(data), CacheTtl.training);
      return Right(data);
    } on ServerException catch (e) {
      if (e.statusCode == 404) return const Left(NotFoundFailure());
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, TrainingSet>> getTrainingByChapter(
      String bookSlug, int chapterOrder) async {
    try {
      final cacheKey =
          CacheKeys.trainingByChapter(bookSlug, chapterOrder);
      final cached =
          await _cache.get<Map<String, dynamic>>(cacheKey);
      if (cached != null) {
        return Right(TrainingSetModel.fromJson(cached));
      }

      final data = await _remote.getTrainingByChapter(
          bookSlug, chapterOrder);
      await _cache.set(
          cacheKey, _trainingSetToJson(data), CacheTtl.training);
      return Right(data);
    } on ServerException catch (e) {
      if (e.statusCode == 404) return const Left(NotFoundFailure());
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, List<Flashcard>>> getFlashcards(
      String activityId) async {
    try {
      final cacheKey = CacheKeys.flashcards(activityId);
      final cached =
          await _cache.get<List<dynamic>>(cacheKey);
      if (cached != null) {
        return Right(cached
            .map((e) =>
                FlashcardModel.fromJson(e as Map<String, dynamic>))
            .toList());
      }

      final data = await _remote.getFlashcards(activityId);
      await _cache.set(
        cacheKey,
        data
            .map((f) =>
                {'id': f.id, 'front': f.front, 'back': f.back})
            .toList(),
        CacheTtl.flashcards,
      );
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, Exam>> getExam(String activityId) async {
    // No cache for exam — fresh each session per §6.1
    try {
      final data = await _remote.getExam(activityId);
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  Map<String, dynamic> _trainingSetToJson(TrainingSet ts) => {
        'id': ts.id,
        'activities': ts.activities
            .map((a) => {
                  'id': a.id,
                  'type': a.type == ActivityType.quiz
                      ? 'QUIZ'
                      : 'FLASHCARD',
                  'stats': {'total_count': a.totalCount},
                })
            .toList(),
      };
}
