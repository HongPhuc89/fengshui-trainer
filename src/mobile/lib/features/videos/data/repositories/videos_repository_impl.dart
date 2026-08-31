import 'package:flutter/foundation.dart';
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/cache/cache_service.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/constants.dart';
import '../../domain/entities/video.dart';
import '../../domain/repositories/videos_repository.dart';
import '../datasources/videos_remote_datasource.dart';
import '../models/video_model.dart';

@Injectable(as: VideosRepository)
class VideosRepositoryImpl implements VideosRepository {
  final VideosRemoteDataSource _remote;
  final CacheService _cache;

  VideosRepositoryImpl(this._remote, this._cache);

  @override
  Future<Either<Failure, List<VideoCategory>>> getCategories() async {
    try {
      final cached = await _cache.get<List<dynamic>>(CacheKeys.videoCategories);
      if (cached != null) {
        return Right(
          cached
              .map(
                (e) => VideoCategoryModel.fromJson(e as Map<String, dynamic>),
              )
              .toList(),
        );
      }

      final data = await _remote.getCategories();
      await _cache.set(
        CacheKeys.videoCategories,
        data
            .map(
              (c) => {
                'public_id': c.publicId,
                'title': c.title,
                'slug': c.slug,
              },
            )
            .toList(),
        CacheTtl.categories,
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
  Future<Either<Failure, List<Video>>> getVideos({
    String? category,
    String? search,
  }) async {
    try {
      final cacheKey = CacheKeys.videos(category: category, search: search);
      if (search == null) {
        final cached = await _cache.get<List<dynamic>>(cacheKey);
        if (cached != null) {
          return Right(
            cached
                .map((e) => VideoModel.fromJson(e as Map<String, dynamic>))
                .toList(),
          );
        }
      }

      final data = await _remote.getVideos(category: category, search: search);
      if (search == null) {
        await _cache.set(
          cacheKey,
          data.map((v) => _videoToJson(v)).toList(),
          CacheTtl.list,
        );
      }
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, List<RecentlyWatchedVideo>>>
  getRecentlyWatched() async {
    try {
      final cached = await _cache.get<List<dynamic>>(CacheKeys.recentlyWatched);
      if (cached != null) {
        return Right(
          cached
              .map(
                (e) => RecentlyWatchedVideoModel.fromJson(
                  e as Map<String, dynamic>,
                ),
              )
              .toList(),
        );
      }

      final data = await _remote.getRecentlyWatched();
      await _cache.set(
        CacheKeys.recentlyWatched,
        data
            .map(
              (r) => {
                'video': _videoToJson(r.video),
                'lesson_slug': r.lessonSlug,
                'lesson_title': r.lessonTitle,
              },
            )
            .toList(),
        CacheTtl.recentlyX,
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
  Future<Either<Failure, VideoDetail>> getVideoDetail(
    String slug, {
    bool forceRefresh = false,
  }) async {
    try {
      final cacheKey = CacheKeys.videoDetail(slug);
      if (!forceRefresh) {
        final cached = await _cache.get<Map<String, dynamic>>(cacheKey);
        if (cached != null) {
          return Right(VideoDetailModel.fromJson(cached));
        }
      }

      final data = await _remote.getVideoDetail(slug);
      await _cache.set(cacheKey, _videoDetailToJson(data), CacheTtl.list);
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
  Future<Either<Failure, CourseProgress>> getCourseProgress(
    String slug,
  ) async {
    try {
      final data = await _remote.getCourseProgress(slug);
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, LessonContent>> getLesson(
    String courseSlug,
    String lessonSlug,
  ) async {
    try {
      final data = await _remote.getLesson(courseSlug, lessonSlug);
      return Right(data);
    } on ServerException catch (e) {
      if (e.statusCode == 403) return const Left(ForbiddenFailure());
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> saveLessonProgress(
    String courseSlug,
    String lessonSlug,
    int seconds,
  ) async {
    try {
      await _remote.saveLessonProgress(courseSlug, lessonSlug, seconds);
      await _cache.delete(CacheKeys.recentlyWatched);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> purchaseVideo(String slug) async {
    try {
      await _remote.purchaseVideo(slug);
      await _cache.delete(CacheKeys.videoDetail(slug));
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e, st) {
      debugPrint('[repo] unexpected failure: $e\n$st');
      return const Left(NetworkFailure());
    }
  }

  Map<String, dynamic> _videoToJson(Video v) => {
    'slug': v.slug,
    'title': v.title,
    'cover_image': v.thumbnailUrl,
    'category': v.category != null
        ? {
            'public_id': v.category!.publicId,
            'title': v.category!.title,
            'slug': v.category!.slug,
          }
        : null,
    'price_lt': v.priceLt,
    'is_vip_only': v.isVipOnly,
    'has_purchased': v.hasPurchased,
    'is_new_release': v.isNewRelease,
    'total_lessons': v.lessonCount,
    'description': v.description,
    'progress_percent': v.progressPercent,
  };

  Map<String, dynamic> _videoDetailToJson(VideoDetail v) => {
    'slug': v.slug,
    'title': v.title,
    'cover_image': v.thumbnailUrl,
    'category': v.category != null
        ? {
            'public_id': v.category!.publicId,
            'title': v.category!.title,
            'slug': v.category!.slug,
          }
        : null,
    'price_lt': v.priceLt,
    'is_vip_only': v.isVipOnly,
    'has_purchased': v.hasPurchased,
    'is_new_release': v.isNewRelease,
    'description': v.description,
    'lessons': v.lessons
        .map(
          (l) => {
            'slug': l.slug,
            'title': l.title,
            'order': l.order,
            'duration_seconds': l.durationSeconds,
            'can_access': l.canAccess,
            'is_completed': l.isCompleted,
            'has_training_set': l.hasTrainingSet,
            'small_thumbnail': l.thumbnailUrl,
          },
        )
        .toList(),
    'last_watched_lesson': v.lastWatchedLessonSlug,
    'instructor': v.instructor,
    'level': v.level,
    'total_lessons': v.totalLessons,
    'total_duration_seconds': v.totalDurationSeconds,
  };
}
