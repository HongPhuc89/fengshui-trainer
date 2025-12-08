import { apiClient } from './client';
import { QuizConfig, QuizAttempt, SubmitQuizRequest, SubmitQuizResponse } from './types';

class QuizService {
  /**
   * Get quiz configuration for a chapter
   */
  async getQuizConfig(bookId: number, chapterId: number): Promise<QuizConfig> {
    return apiClient.get<QuizConfig>(`/books/${bookId}/chapters/${chapterId}/quiz/info`);
  }

  /**
   * Start a new quiz attempt
   * This generates random questions based on the quiz configuration
   */
  async startQuiz(bookId: number, chapterId: number): Promise<QuizAttempt> {
    return apiClient.post<QuizAttempt>(`/books/${bookId}/chapters/${chapterId}/quiz/start`);
  }

  /**
   * Submit quiz answers
   */
  async submitQuiz(bookId: number, chapterId: number, data: SubmitQuizRequest): Promise<SubmitQuizResponse> {
    return apiClient.post<SubmitQuizResponse>(`/books/${bookId}/chapters/${chapterId}/quiz/submit`, data);
  }

  /**
   * Get user's quiz attempt history for a chapter
   */
  async getAttemptHistory(bookId: number, chapterId: number): Promise<QuizAttempt[]> {
    return apiClient.get<QuizAttempt[]>(`/books/${bookId}/chapters/${chapterId}/quiz/attempts`);
  }

  /**
   * Get details of a specific quiz attempt
   */
  async getAttemptById(bookId: number, chapterId: number, attemptId: number): Promise<QuizAttempt> {
    return apiClient.get<QuizAttempt>(`/books/${bookId}/chapters/${chapterId}/quiz/attempts/${attemptId}`);
  }
}

export const quizService = new QuizService();
