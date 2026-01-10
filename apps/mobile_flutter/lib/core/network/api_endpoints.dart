class ApiEndpoints {
  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refreshToken = '/auth/refresh';

  // Books
  static const String books = '/books';
  static String bookDetail(int id) => '/books/$id';
  static String bookChapters(int bookId) => '/books/$bookId/chapters';

  // Chapters
  static String chapterDetail(int bookId, int chapterId) =>
      '/books/$bookId/chapters/$chapterId';
  static String chapterProgress(int chapterId) =>
      '/chapters/$chapterId/progress';

  // Flashcards
  static String chapterFlashcards(int bookId, int chapterId) =>
      '/books/$bookId/chapters/$chapterId/flashcards';
  static String chapterFlashcardsRandom(int bookId, int chapterId) =>
      '/books/$bookId/chapters/$chapterId/flashcards/random';
  static String flashcardDetail(int bookId, int chapterId, int flashcardId) =>
      '/books/$bookId/chapters/$chapterId/flashcards/$flashcardId';

  // Quiz (using quiz-sessions API)
  static String quizStart(int chapterId) =>
      '/quiz-sessions/start/$chapterId';
  static String quizAnswer(String sessionId) =>
      '/quiz-sessions/$sessionId/answer';
  static String quizComplete(String sessionId) =>
      '/quiz-sessions/$sessionId/complete';
  static String quizSession(String sessionId) =>
      '/quiz-sessions/$sessionId';
  static String quizHistory(int chapterId) =>
      '/quiz-sessions/chapter/$chapterId/history';
  static const String quizMySessions = '/quiz-sessions/my-sessions';

  // Mindmap
  static String mindmap(int bookId, int chapterId) =>
      '/books/$bookId/chapters/$chapterId/mindmap';

  // Profile
  static const String profile = '/auth/me';
  
  // Experience
  static const String leaderboard = '/experience/leaderboard';
  static const String experience = '/experience/users';
  static const String dailyCheckin = '/experience/users/daily-checkin';
  
  // Flashcards random (used by repository)
  static String flashcardsRandom(int bookId, int chapterId) =>
      '/books/$bookId/chapters/$chapterId/flashcards/random';
}
