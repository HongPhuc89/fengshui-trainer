class ApiEndpoints {
  ApiEndpoints._();

  // Auth
  // Mobile has its own login: one bound handset per account, and a change of
  // handset requires a code issued by an administrator.
  // One endpoint: pairing_code is optional and only sent the first time this
  // handset appears.
  static const login = '/auth/mobile/login/';
  static const refresh = '/auth/refresh/';
  static const logout = '/auth/logout/';

  // User
  static const me = '/users/me/';
  static const avatar = '/users/me/avatar/';
  static const deviceStatus = '/users/me/device-status/';
  static const changePassword = '/users/me/change-password/';

  // Wallet
  static const walletBalance = '/wallet/me/';
  static const walletHistory = '/wallet/history/';

  // Books
  static const bookCategories = '/api/books/categories/';
  static const books = '/api/books/';
  static const recentlyRead = '/api/books/recently-read/';
  static String bookDetail(String slug) => '/api/books/$slug/';
  static String bookProgress(String slug) => '/api/books/$slug/progress/';
  static String chapter(String slug, int order) =>
      '/api/books/$slug/chapters/$order/';
  static String chapterDecryptKey(String slug, int order) =>
      '/api/books/$slug/chapters/$order/decrypt-key/';
  static String chapterEncryptedFile(String slug, int order) =>
      '/api/books/$slug/chapters/$order/encrypted-file/';
  static String chapterProgress(String slug, int order) =>
      '/api/books/$slug/chapters/$order/progress/';

  // Videos
  static const videoCategories = '/api/videos/categories/';
  static const videos = '/api/videos/';
  static const recentlyWatched = '/api/videos/recently-watched/';
  static String videoDetail(String slug) => '/api/videos/$slug/';
  static String lesson(String courseSlug, String lessonSlug) =>
      '/api/videos/$courseSlug/lessons/$lessonSlug/';
  static String lessonProgress(String courseSlug, String lessonSlug) =>
      '/api/videos/$courseSlug/lessons/$lessonSlug/progress/';
  static String courseProgress(String slug) => '/api/videos/$slug/progress/';
  static String lastLesson(String slug) =>
      '/api/videos/$slug/progress/last-lesson/';

  // Training
  static String trainingByLesson(String lessonSlug) =>
      '/api/training/lesson/$lessonSlug/';
  static String trainingByChapter(String bookSlug, int order) =>
      '/api/training/chapter/$bookSlug/$order/';
  static String activityFlashcards(String activityId) =>
      '/api/training/activities/$activityId/flashcards/';
  static String activityExam(String activityId) =>
      '/api/training/activities/$activityId/exam/';

  // Payments
  static const purchaseBook = '/payments/purchase-book/';
  static const purchaseVideo = '/payments/purchase-video/';
}
