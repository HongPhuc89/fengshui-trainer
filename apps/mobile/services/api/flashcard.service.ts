import { apiClient } from './client';

export interface Flashcard {
  id: number;
  chapter_id: number;
  front: string;
  back: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashcardProgress {
  flashcard_id: number;
  user_id: number;
  mastery_level: number;
  last_reviewed_at: string;
  next_review_at: string;
  review_count: number;
}

export interface ReviewRequest {
  flashcard_id: number;
  quality: number; // 0-5 (SuperMemo algorithm)
}

export interface ReviewResponse {
  flashcard: Flashcard;
  progress: FlashcardProgress;
  next_flashcard?: Flashcard;
}

class FlashcardService {
  /**
   * Get all flashcards for a chapter
   */
  async getChapterFlashcards(chapterId: number): Promise<Flashcard[]> {
    return apiClient.get<Flashcard[]>(`/chapters/${chapterId}/flashcards`);
  }

  /**
   * Get flashcards due for review
   */
  async getDueFlashcards(chapterId: number): Promise<Flashcard[]> {
    return apiClient.get<Flashcard[]>(`/chapters/${chapterId}/flashcards/due`);
  }

  /**
   * Get user's flashcard progress
   */
  async getProgress(chapterId: number): Promise<FlashcardProgress[]> {
    return apiClient.get<FlashcardProgress[]>(`/chapters/${chapterId}/flashcards/progress`);
  }

  /**
   * Submit flashcard review
   */
  async submitReview(chapterId: number, data: ReviewRequest): Promise<ReviewResponse> {
    return apiClient.post<ReviewResponse>(`/chapters/${chapterId}/flashcards/review`, data);
  }

  /**
   * Get single flashcard
   */
  async getFlashcard(flashcardId: number): Promise<Flashcard> {
    return apiClient.get<Flashcard>(`/flashcards/${flashcardId}`);
  }

  /**
   * Reset progress for a flashcard
   */
  async resetProgress(flashcardId: number): Promise<void> {
    await apiClient.post(`/flashcards/${flashcardId}/reset`);
  }

  /**
   * Get statistics for a chapter
   */
  async getStats(chapterId: number): Promise<{
    total: number;
    mastered: number;
    learning: number;
    new: number;
  }> {
    return apiClient.get(`/chapters/${chapterId}/flashcards/stats`);
  }
}

export const flashcardService = new FlashcardService();
