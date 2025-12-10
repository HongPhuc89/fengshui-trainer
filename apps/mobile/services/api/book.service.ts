import { apiClient } from './client';

export interface Book {
  id: number;
  title: string;
  description?: string;
  cover_image_url?: string;
  author?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: number;
  book_id: number;
  title: string;
  description?: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChapterWithStats extends Chapter {
  flashcard_count?: number;
  question_count?: number;
  has_mindmap?: boolean;
  user_progress?: {
    flashcards_mastered: number;
    quizzes_completed: number;
    last_activity_at?: string;
  };
}

export interface BookWithChapters extends Book {
  chapters: ChapterWithStats[];
}

class BookService {
  /**
   * Get all active books
   */
  async getBooks(): Promise<Book[]> {
    return apiClient.get<Book[]>('/books');
  }

  /**
   * Get single book with chapters
   */
  async getBook(bookId: number): Promise<BookWithChapters> {
    return apiClient.get<BookWithChapters>(`/books/${bookId}`);
  }

  /**
   * Get chapters for a book
   */
  async getChapters(bookId: number): Promise<ChapterWithStats[]> {
    return apiClient.get<ChapterWithStats[]>(`/books/${bookId}/chapters`);
  }

  /**
   * Get single chapter
   */
  async getChapter(chapterId: number): Promise<ChapterWithStats> {
    return apiClient.get<ChapterWithStats>(`/chapters/${chapterId}`);
  }

  /**
   * Search books
   */
  async searchBooks(query: string): Promise<Book[]> {
    return apiClient.get<Book[]>('/books/search', {
      params: { q: query },
    });
  }

  /**
   * Get user's recent books
   */
  async getRecentBooks(): Promise<Book[]> {
    return apiClient.get<Book[]>('/books/recent');
  }

  /**
   * Get user's favorite books
   */
  async getFavoriteBooks(): Promise<Book[]> {
    return apiClient.get<Book[]>('/books/favorites');
  }

  /**
   * Add book to favorites
   */
  async addToFavorites(bookId: number): Promise<void> {
    await apiClient.post(`/books/${bookId}/favorite`);
  }

  /**
   * Remove book from favorites
   */
  async removeFromFavorites(bookId: number): Promise<void> {
    await apiClient.delete(`/books/${bookId}/favorite`);
  }

  /**
   * Get user's overall progress
   */
  async getUserProgress(): Promise<{
    total_books: number;
    books_in_progress: number;
    books_completed: number;
    total_flashcards_mastered: number;
    total_quizzes_completed: number;
  }> {
    return apiClient.get('/books/progress');
  }
}

export const bookService = new BookService();
