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

  /// Not cached — same as web, which re-fetches on every visit rather than
  /// TTL-caching a value that changes as soon as the user finishes a lesson.
  Future<Either<Failure, CourseProgress>> getCourseProgress(String slug);
  Future<Either<Failure, LessonContent>> getLesson(
    String courseSlug,
    String lessonSlug,
  );

  /// Marks [lessonSlug] as the course's last-watched lesson (server side,
  /// `UserCourseProgress.last_lesson`) — mirrors web's `setLastLesson`,
  /// called fire-and-forget whenever a lesson starts loading. Without this,
  /// [getLastLessonOrder] below has nothing to return (server defaults to
  /// the course's first lesson), and Home's "continue watching" card never
  /// updates past whatever lesson was watched first.
  ///
  /// Note: `VideoDetail.lastWatchedLessonSlug` is NOT how this value gets
  /// read back — the course-detail response never carries a
  /// `last_watched_lesson` field (that entity field is effectively dead;
  /// left in place rather than removed here to keep this fix scoped).
  /// Reading it back goes through [getLastLessonOrder] instead, exactly
  /// like web never reads it off the course object either.
  Future<Either<Failure, void>> setLastLesson(
    String courseSlug,
    String lessonSlug,
  );

  /// Not cached — same as web (`getLastLesson`), fetched fresh at the
  /// moment the "Tiếp tục học" CTA is tapped, not preloaded with the course
  /// detail. Returns null only when the course has no lessons.
  Future<Either<Failure, int?>> getLastLessonOrder(String courseSlug);
  Future<Either<Failure, void>> saveLessonProgress(
    String courseSlug,
    String lessonSlug,
    int seconds,
  );
  Future<Either<Failure, void>> purchaseVideo(String slug);
}
