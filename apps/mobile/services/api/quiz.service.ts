import { apiClient } from './client';

export interface Question {
  id: number;
  question_type: string;
  difficulty: string;
  question_text: string;
  points: number;
  options: any;
}

export interface QuizSession {
  id: number;
  user_id: number;
  chapter_id: number;
  questions: Question[];
  answers: Record<number, any>;
  score?: number;
  total_points: number;
  percentage?: number;
  passed?: boolean;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  started_at: string;
  completed_at?: string;
  time_limit_minutes: number;
}

export interface QuizResult extends QuizSession {
  score: number;
  percentage: number;
  passed: boolean;
  passing_score_percentage?: number;
  correct_count?: number;
  incorrect_count?: number;
  total_questions?: number;
  results?: Array<{
    question_id: number;
    question_text: string;
    is_correct: boolean;
    points: number;
    user_answer: any;
  }>;
}

class QuizService {
  /**
   * Start a new quiz session
   */
  async startQuiz(chapterId: number): Promise<QuizSession> {
    return apiClient.post<QuizSession>(`/quiz-sessions/start/${chapterId}`);
  }

  /**
   * Submit an answer for a question
   */
  async submitAnswer(sessionId: number, questionId: number, answer: any): Promise<QuizSession> {
    return apiClient.post<QuizSession>(`/quiz-sessions/${sessionId}/answer`, {
      question_id: questionId,
      answer,
    });
  }

  /**
   * Complete quiz and get results
   */
  async completeQuiz(sessionId: number): Promise<QuizResult> {
    return apiClient.post<QuizResult>(`/quiz-sessions/${sessionId}/complete`);
  }

  /**
   * Get quiz session details
   */
  async getSession(sessionId: number): Promise<QuizSession> {
    return apiClient.get<QuizSession>(`/quiz-sessions/${sessionId}`);
  }

  /**
   * Get quiz history for a chapter
   */
  async getChapterHistory(chapterId: number): Promise<QuizSession[]> {
    return apiClient.get<QuizSession[]>(`/quiz-sessions/chapter/${chapterId}/history`);
  }

  /**
   * Get all user quiz sessions
   */
  async getMySessions(): Promise<QuizSession[]> {
    return apiClient.get<QuizSession[]>('/quiz-sessions/my-sessions');
  }
}

export const quizService = new QuizService();
