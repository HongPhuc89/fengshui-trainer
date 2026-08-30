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
  Future<Either<Failure, VideoDetail>> getVideoDetail(String slug);
  Future<Either<Failure, LessonContent>> getLesson(
      String courseSlug, String lessonSlug);
  Future<Either<Failure, void>> saveLessonProgress(
      String courseSlug, String lessonSlug, int seconds);
  Future<Either<Failure, void>> purchaseVideo(String slug);
}
