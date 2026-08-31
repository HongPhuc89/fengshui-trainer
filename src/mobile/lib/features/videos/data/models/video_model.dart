import '../../domain/entities/video.dart';

class VideoCategoryModel extends VideoCategory {
  const VideoCategoryModel({
    required super.publicId,
    required super.title,
    required super.slug,
  });

  factory VideoCategoryModel.fromJson(Map<String, dynamic> json) {
    return VideoCategoryModel(
      publicId: json['public_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
    );
  }
}

class VideoModel extends Video {
  const VideoModel({
    required super.slug,
    required super.title,
    super.thumbnailUrl,
    super.category,
    required super.priceLt,
    required super.isVipOnly,
    required super.hasPurchased,
    required super.isNewRelease,
    required super.lessonCount,
    super.description,
    super.progressPercent,
  });

  factory VideoModel.fromJson(Map<String, dynamic> json) {
    VideoCategory? cat;
    if (json['category'] is Map) {
      cat = VideoCategoryModel.fromJson(
          json['category'] as Map<String, dynamic>);
    }
    return VideoModel(
      slug: json['slug'] as String,
      title: json['title'] as String,
      // VideoCourseListSerializer exposes this as cover_image (falling back to
      // the first lesson's thumbnail server-side); there is no 'thumbnail' key
      // on a course, so reading one left every card without its banner.
      thumbnailUrl: json['cover_image'] as String?,
      category: cat,
      priceLt: json['price_lt'] as int? ?? 0,
      isVipOnly: json['is_vip_only'] as bool? ?? false,
      hasPurchased: json['has_purchased'] as bool? ?? false,
      isNewRelease: json['is_new_release'] as bool? ?? false,
      lessonCount: json['total_lessons'] as int? ?? 0,
      description: json['description'] as String?,
      progressPercent:
          (json['progress_percent'] as num?)?.toDouble(),
    );
  }
}

class LessonMetaModel extends LessonMeta {
  const LessonMetaModel({
    required super.slug,
    required super.title,
    required super.order,
    required super.durationSeconds,
    required super.canAccess,
    required super.isCompleted,
    required super.hasTrainingSet,
  });

  factory LessonMetaModel.fromJson(Map<String, dynamic> json) {
    return LessonMetaModel(
      slug: json['slug'] as String,
      title: json['title'] as String,
      order: json['order'] as int? ?? 0,
      durationSeconds: json['duration_seconds'] as int? ?? 0,
      canAccess: json['can_access'] as bool? ?? false,
      isCompleted: json['is_completed'] as bool? ?? false,
      hasTrainingSet: json['has_training_set'] as bool? ?? false,
    );
  }
}

class VideoDetailModel extends VideoDetail {
  const VideoDetailModel({
    required super.slug,
    required super.title,
    super.thumbnailUrl,
    super.category,
    required super.priceLt,
    required super.isVipOnly,
    required super.hasPurchased,
    required super.isNewRelease,
    super.description,
    required super.lessons,
    super.lastWatchedLessonSlug,
  });

  factory VideoDetailModel.fromJson(Map<String, dynamic> json) {
    VideoCategory? cat;
    if (json['category'] is Map) {
      cat = VideoCategoryModel.fromJson(
          json['category'] as Map<String, dynamic>);
    }

    final lessonsRaw = json['lessons'] as List<dynamic>? ?? [];
    final lessons = lessonsRaw
        .map((l) =>
            LessonMetaModel.fromJson(l as Map<String, dynamic>))
        .toList();

    String? lastSlug;
    if (json['last_watched_lesson'] is Map) {
      lastSlug = json['last_watched_lesson']['slug'] as String?;
    } else if (json['last_watched_lesson'] is String) {
      lastSlug = json['last_watched_lesson'] as String;
    }

    return VideoDetailModel(
      slug: json['slug'] as String,
      title: json['title'] as String,
      thumbnailUrl: json['cover_image'] as String?,
      category: cat,
      priceLt: json['price_lt'] as int? ?? 0,
      isVipOnly: json['is_vip_only'] as bool? ?? false,
      hasPurchased: json['has_purchased'] as bool? ?? false,
      isNewRelease: json['is_new_release'] as bool? ?? false,
      description: json['description'] as String?,
      lessons: lessons,
      lastWatchedLessonSlug: lastSlug,
    );
  }
}

class LessonContentModel extends LessonContent {
  const LessonContentModel({
    required super.slug,
    required super.title,
    required super.order,
    required super.videoUrl,
    super.hlsUrl,
    super.hlsHeaders,
    required super.durationSeconds,
    required super.hasTrainingSet,
  });

  factory LessonContentModel.fromJson(Map<String, dynamic> json) {
    final headers = json['hls_headers'];
    return LessonContentModel(
      slug: json['slug'] as String,
      title: json['title'] as String,
      order: json['order'] as int? ?? 0,
      videoUrl: json['video_url'] as String? ?? '',
      hlsUrl: json['hls_url'] as String?,
      hlsHeaders: headers is Map
          ? headers.map((k, v) => MapEntry(k.toString(), v.toString()))
          : const {},
      durationSeconds: json['duration_seconds'] as int? ?? 0,
      hasTrainingSet: json['has_training_set'] as bool? ?? false,
    );
  }
}

class RecentlyWatchedVideoModel extends RecentlyWatchedVideo {
  RecentlyWatchedVideoModel({
    required Video video,
    super.lessonSlug,
    super.lessonTitle,
  }) : super(video: video);

  factory RecentlyWatchedVideoModel.fromJson(
      Map<String, dynamic> json) {
    final video = VideoModel.fromJson(
        json['video'] as Map<String, dynamic>? ?? json);
    return RecentlyWatchedVideoModel(
      video: video,
      lessonSlug: json['lesson_slug'] as String?,
      lessonTitle: json['lesson_title'] as String?,
    );
  }
}
