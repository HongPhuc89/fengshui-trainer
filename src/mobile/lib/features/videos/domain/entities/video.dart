import 'package:equatable/equatable.dart';

class VideoCategory extends Equatable {
  // The API exposes public_id/title, never the internal integer pk — see
  // BaseModel on the server. Field names mirror the wire format so the cache
  // and the network response can share one fromJson.
  final String publicId;
  final String title;
  final String slug;

  const VideoCategory({
    required this.publicId,
    required this.title,
    required this.slug,
  });

  @override
  List<Object?> get props => [publicId, title, slug];
}

class Video extends Equatable {
  final String slug;
  final String title;
  final String? thumbnailUrl;
  final VideoCategory? category;
  final int priceLt;
  final bool isVipOnly;
  final bool hasPurchased;
  final bool isNewRelease;
  final int lessonCount;
  final String? description;
  final double? progressPercent;

  const Video({
    required this.slug,
    required this.title,
    this.thumbnailUrl,
    this.category,
    required this.priceLt,
    required this.isVipOnly,
    required this.hasPurchased,
    required this.isNewRelease,
    required this.lessonCount,
    this.description,
    this.progressPercent,
  });

  @override
  List<Object?> get props => [slug, title];
}

class LessonMeta extends Equatable {
  final String slug;
  final String title;
  final int order;
  final int durationSeconds;
  final bool canAccess;
  final bool isCompleted;
  final bool hasTrainingSet;
  final String? thumbnailUrl;

  const LessonMeta({
    required this.slug,
    required this.title,
    required this.order,
    required this.durationSeconds,
    required this.canAccess,
    required this.isCompleted,
    required this.hasTrainingSet,
    this.thumbnailUrl,
  });

  String get durationLabel {
    final m = durationSeconds ~/ 60;
    final s = durationSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  List<Object?> get props => [slug, title, order];
}

class VideoDetail extends Equatable {
  final String slug;
  final String title;
  final String? thumbnailUrl;
  final VideoCategory? category;
  final int priceLt;
  final bool isVipOnly;
  final bool hasPurchased;
  final bool isNewRelease;
  final String? description;
  final List<LessonMeta> lessons;
  final String? lastWatchedLessonSlug;
  final String? instructor;

  /// 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' — raw backend value, mapped to
  /// a Vietnamese label + color at the UI layer (mirrors web's LEVEL_MAP).
  final String? level;
  final int totalLessons;
  final int totalDurationSeconds;

  const VideoDetail({
    required this.slug,
    required this.title,
    this.thumbnailUrl,
    this.category,
    required this.priceLt,
    required this.isVipOnly,
    required this.hasPurchased,
    required this.isNewRelease,
    this.description,
    required this.lessons,
    this.lastWatchedLessonSlug,
    this.instructor,
    this.level,
    this.totalLessons = 0,
    this.totalDurationSeconds = 0,
  });

  @override
  List<Object?> get props => [slug, title];
}

/// Overall course completion — mirrors the server's CourseProgressSerializer
/// (GET /api/videos/{slug}/progress/), fetched separately from VideoDetail.
class CourseProgress extends Equatable {
  final int progressPercent;
  final int completedLessons;
  final int totalLessons;

  const CourseProgress({
    required this.progressPercent,
    required this.completedLessons,
    required this.totalLessons,
  });

  @override
  List<Object?> get props => [progressPercent, completedLessons, totalLessons];
}

class LessonContent extends Equatable {
  final String slug;
  final String title;
  final int order;

  /// Bunny iframe embed page. Playable in a WebView, NOT by a native player.
  final String videoUrl;

  /// HLS master playlist for native playback; null when the lesson has no
  /// Bunny id or the server is not on the Bunny backend.
  final String? hlsUrl;

  /// Headers [hlsUrl] must be fetched with — the pull zone answers 403 without
  /// the Referer. Supplied by the server so the policy stays in one place.
  final Map<String, String> hlsHeaders;

  final int durationSeconds;
  final bool hasTrainingSet;

  const LessonContent({
    required this.slug,
    required this.title,
    required this.order,
    required this.videoUrl,
    this.hlsUrl,
    this.hlsHeaders = const {},
    required this.durationSeconds,
    required this.hasTrainingSet,
  });

  @override
  List<Object?> get props => [slug, title];
}

class RecentlyWatchedVideo extends Equatable {
  final Video video;
  final String? lessonSlug;
  final String? lessonTitle;

  const RecentlyWatchedVideo({
    required this.video,
    this.lessonSlug,
    this.lessonTitle,
  });

  @override
  List<Object?> get props => [video.slug, lessonSlug];
}
