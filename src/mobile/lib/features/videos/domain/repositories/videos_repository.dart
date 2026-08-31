import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/video.dart';

abstract class VideosRepository {
  Future<Either<Failure, List<VideoCategory>>> getCategories();
  Future<Either<Failure, List<Video>>> getVideos({
    String? category,
    String? search,
  });
  Future<Either<Failure, List<RecentlyWatchedVideo>>> getRecentlyWatched();

  /// forceRefresh skips the cached copy and re-fetches from the server —
  /// used by pull-to-refresh, since a stale lesson list otherwise sits behind
  /// the cache TTL with no way for the user to clear it themselves.
  Future<Either<Failure, VideoDetail>> getVideoDetail(
    String slug, {
    bool forceRefresh = false,
  });
  Future<Either<Failure, LessonContent>> getLesson(
    String courseSlug,
    String lessonSlug,
  );
  Future<Either<Failure, void>> saveLessonProgress(
    String courseSlug,
    String lessonSlug,
    int seconds,
  );
  Future<Either<Failure, void>> purchaseVideo(String slug);
}
