class ApiEndpoints {
  ApiEndpoints._();

  // Every path here is relative to AppConfig.apiBaseUrl, which must include the
  // server's /api prefix. Do not repeat /api in the constants: Dio concatenates
  // baseUrl + path verbatim, so it would produce /api/api/... and 404.

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
  static const bookCategories = '/books/categories/';
  static const books = '/books/';
  static const recentlyRead = '/books/recently-read/';
  static String bookDetail(String slug) => '/books/$slug/';
  static String bookProgress(String slug) => '/books/$slug/progress/';
  static String chapter(String slug, int order) =>
      '/books/$slug/chapters/$order/';
  static String chapterDecryptKey(String slug, int order) =>
      '/books/$slug/chapters/$order/decrypt-key/';
  static String chapterEncryptedFile(String slug, int order) =>
      '/books/$slug/chapters/$order/encrypted-file/';
  static String chapterProgress(String slug, int order) =>
      '/books/$slug/chapters/$order/progress/';

  // Videos
  static const videoCategories = '/videos/categories/';
  static const videos = '/videos/';
  static const recentlyWatched = '/videos/recently-watched/';
  static String videoDetail(String slug) => '/videos/$slug/';
  static String lesson(String courseSlug, String lessonSlug) =>
      '/videos/$courseSlug/lessons/$lessonSlug/';
  static String lessonProgress(String courseSlug, String lessonSlug) =>
      '/videos/$courseSlug/lessons/$lessonSlug/progress/';
  static String courseProgress(String slug) => '/videos/$slug/progress/';
  static String lastLesson(String slug) =>
      '/videos/$slug/progress/last-lesson/';

  // Training
  static String trainingByLesson(String lessonSlug) =>
      '/training/lesson/$lessonSlug/';
  static String trainingByChapter(String bookSlug, int order) =>
      '/training/chapter/$bookSlug/$order/';
  static String activityFlashcards(String activityId) =>
      '/training/activities/$activityId/flashcards/';
  static String activityExam(String activityId) =>
      '/training/activities/$activityId/exam/';

  // Payments
  static const purchaseBook = '/payments/purchase-book/';
  static const purchaseVideo = '/payments/purchase-video/';
}
