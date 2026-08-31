import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../models/video_model.dart';

abstract class VideosRemoteDataSource {
  Future<List<VideoCategoryModel>> getCategories();
  Future<List<VideoModel>> getVideos({String? category, String? search});
  Future<List<RecentlyWatchedVideoModel>> getRecentlyWatched();
  Future<VideoDetailModel> getVideoDetail(String slug);
  Future<CourseProgressModel> getCourseProgress(String slug);
  Future<LessonContentModel> getLesson(
      String courseSlug, String lessonSlug);
  Future<void> setLastLesson(String courseSlug, String lessonSlug);

  /// Returns the order of the course's last-watched lesson — defaults to
  /// the first lesson server-side if the user has never watched any (see
  /// CourseLastLessonView.get), so `null` here means the course has no
  /// lessons at all, not "hasn't started".
  Future<int?> getLastLessonOrder(String courseSlug);
  Future<void> saveLessonProgress(
      String courseSlug, String lessonSlug, int seconds);
  Future<void> purchaseVideo(String slug);
}

@Injectable(as: VideosRemoteDataSource)
class VideosRemoteDataSourceImpl implements VideosRemoteDataSource {
  final ApiClient _apiClient;

  VideosRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<VideoCategoryModel>> getCategories() async {
    try {
      final resp =
          await _apiClient.get(ApiEndpoints.videoCategories);
      final list = resp.data as List<dynamic>;
      return list
          .map((e) =>
              VideoCategoryModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<List<VideoModel>> getVideos(
      {String? category, String? search}) async {
    try {
      final params = <String, dynamic>{};
      if (category != null) params['category'] = category;
      if (search != null && search.isNotEmpty) params['search'] = search;

      final resp = await _apiClient.get(
        ApiEndpoints.videos,
        queryParameters: params,
      );

      final data = resp.data;
      final List<dynamic> list = data is Map
          ? (data['results'] as List<dynamic>? ?? [])
          : data as List<dynamic>;

      return list
          .map((e) => VideoModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<List<RecentlyWatchedVideoModel>> getRecentlyWatched() async {
    try {
      final resp =
          await _apiClient.get(ApiEndpoints.recentlyWatched);
      final list = resp.data as List<dynamic>;
      return list
          .map((e) => RecentlyWatchedVideoModel.fromJson(
              e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<VideoDetailModel> getVideoDetail(String slug) async {
    try {
      final resp =
          await _apiClient.get(ApiEndpoints.videoDetail(slug));
      return VideoDetailModel.fromJson(
          resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<CourseProgressModel> getCourseProgress(String slug) async {
    try {
      final resp =
          await _apiClient.get(ApiEndpoints.courseProgress(slug));
      return CourseProgressModel.fromJson(
          resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<LessonContentModel> getLesson(
      String courseSlug, String lessonSlug) async {
    try {
      final resp = await _apiClient
          .get(ApiEndpoints.lesson(courseSlug, lessonSlug));
      return LessonContentModel.fromJson(
          resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<int?> getLastLessonOrder(String courseSlug) async {
    try {
      final resp =
          await _apiClient.get(ApiEndpoints.lastLesson(courseSlug));
      return (resp.data as Map<String, dynamic>)['lesson_order'] as int?;
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<void> setLastLesson(String courseSlug, String lessonSlug) async {
    try {
      await _apiClient.post(
        ApiEndpoints.lastLesson(courseSlug),
        data: {'lesson_slug': lessonSlug},
      );
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<void> saveLessonProgress(
      String courseSlug, String lessonSlug, int seconds) async {
    try {
      await _apiClient.post(
        ApiEndpoints.lessonProgress(courseSlug, lessonSlug),
        data: {'position_seconds': seconds},
      );
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<void> purchaseVideo(String slug) async {
    try {
      await _apiClient.post(ApiEndpoints.purchaseVideo,
          data: {'video_slug': slug});
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }
}
