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
  
  
  // Quiz
  static String quizConfig(int bookId, int chapterId) => 
      '/books/$bookId/chapters/$chapterId/quiz/info';
  static String quizStart(int bookId, int chapterId) => 
      '/books/$bookId/chapters/$chapterId/quiz/start';
  static String quizSubmit(int bookId, int chapterId) => 
      '/books/$bookId/chapters/$chapterId/quiz/submit';
  static String quizAttempts(int bookId, int chapterId) => 
      '/books/$bookId/chapters/$chapterId/quiz/attempts';
  static String quizAttemptDetail(int bookId, int chapterId, int attemptId) => 
      '/books/$bookId/chapters/$chapterId/quiz/attempts/$attemptId';
  
  
  // Mindmap
  static String mindmap(int bookId, int chapterId) => 
      '/books/$bookId/chapters/$chapterId/mindmap';
  
  
  // Profile
  static const String profile = '/auth/me';
  static const String experience = '/experience/users';
  static const String dailyCheckin = '/experience/users/daily-checkin';
}
