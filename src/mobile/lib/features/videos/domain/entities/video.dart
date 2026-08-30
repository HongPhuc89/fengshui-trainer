import 'package:equatable/equatable.dart';

class VideoCategory extends Equatable {
  final int id;
  final String name;
  final String slug;

  const VideoCategory({
    required this.id,
    required this.name,
    required this.slug,
  });

  @override
  List<Object?> get props => [id, name, slug];
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

  const LessonMeta({
    required this.slug,
    required this.title,
    required this.order,
    required this.durationSeconds,
    required this.canAccess,
    required this.isCompleted,
    required this.hasTrainingSet,
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
  });

  @override
  List<Object?> get props => [slug, title];
}

class LessonContent extends Equatable {
  final String slug;
  final String title;
  final int order;
  final String videoUrl;
  final int durationSeconds;
  final bool hasTrainingSet;

  const LessonContent({
    required this.slug,
    required this.title,
    required this.order,
    required this.videoUrl,
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
