import { apiClient } from './client';
import { Flashcard } from './types';

class FlashcardsService {
  /**
   * Get all flashcards for a chapter
   */
  async getFlashcardsByChapter(bookId: number, chapterId: number): Promise<Flashcard[]> {
    return apiClient.get<Flashcard[]>(`/books/${bookId}/chapters/${chapterId}/flashcards`);
  }

  /**
   * Get random flashcards from a chapter
   * @param count Number of random flashcards to retrieve (1-50, default: 5)
   */
  async getRandomFlashcards(bookId: number, chapterId: number, count: number = 5): Promise<Flashcard[]> {
    return apiClient.get<Flashcard[]>(`/books/${bookId}/chapters/${chapterId}/flashcards/random`, {
      params: { count },
    });
  }

  /**
   * Get a specific flashcard by ID
   */
  async getFlashcardById(bookId: number, chapterId: number, flashcardId: number): Promise<Flashcard> {
    return apiClient.get<Flashcard>(`/books/${bookId}/chapters/${chapterId}/flashcards/${flashcardId}`);
  }
}

export const flashcardsService = new FlashcardsService();
