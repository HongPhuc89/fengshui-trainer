class AppConfig {
  AppConfig._();

  /// Base URL of the API, including the server's `/api` prefix.
  ///
  /// Supplied at build time and deliberately has NO default: an omitted
  /// --dart-define-from-file used to fall back to the production host, so a
  /// local build could silently talk to the live server. assertConfigured()
  /// turns that into a loud failure at startup instead.
  static const apiBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// Call once at startup, before anything builds a client.
  static void assertConfigured() {
    if (apiBaseUrl.isEmpty) {
      throw StateError(
        'API_BASE_URL is not set. Build with '
        '--dart-define-from-file=env.local.json (local) or env.dev.json (server).',
      );
    }
  }
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
  // The suffix is bumped whenever the cached shape changes. v2: the course
  // banner moved from 'thumbnail' to 'cover_image', so entries written by an
  // older build would deserialise to a null image and show a blank card for the
  // whole TTL after an update.
  static String videos({String? category, String? search}) =>
      'videos_v2_${category ?? ''}_${search ?? ''}';
  static String bookDetail(String slug) => 'book_$slug';
  static String videoDetail(String slug) => 'video_v2_$slug';
  static const recentlyRead = 'recently_read';
  static const recentlyWatched = 'recently_watched_v2';
  static String trainingByLesson(String slug) => 'training_lesson_$slug';
  static String trainingByChapter(String bookSlug, int order) =>
      'training_chapter_${bookSlug}_$order';
  static String flashcards(String activityId) => 'flashcards_$activityId';
}
