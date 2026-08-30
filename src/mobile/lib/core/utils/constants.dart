class AppConfig {
  AppConfig._();

  // Update this per environment (dev/staging/prod)
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.huyenhoc.pro',
  );
}

class CacheTtl {
  CacheTtl._();

  static const categories = Duration(hours: 12);
  static const list = Duration(hours: 1);
  static const recentlyX = Duration(minutes: 5);
  static const training = Duration(minutes: 15);
  static const flashcards = Duration(minutes: 10);
}

class CacheKeys {
  CacheKeys._();

  static const bookCategories = 'book_categories';
  static const videoCategories = 'video_categories';
  static String books({String? category, String? search}) =>
      'books_${category ?? ''}_${search ?? ''}';
  static String videos({String? category, String? search}) =>
      'videos_${category ?? ''}_${search ?? ''}';
  static String bookDetail(String slug) => 'book_$slug';
  static String videoDetail(String slug) => 'video_$slug';
  static const recentlyRead = 'recently_read';
  static const recentlyWatched = 'recently_watched';
  static String trainingByLesson(String slug) => 'training_lesson_$slug';
  static String trainingByChapter(String bookSlug, int order) =>
      'training_chapter_${bookSlug}_$order';
  static String flashcards(String activityId) => 'flashcards_$activityId';
}
