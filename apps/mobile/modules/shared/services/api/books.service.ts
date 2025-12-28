import { apiClient } from './client';
import { Book, Chapter } from './types';

class BooksService {
  /**
   * Get all published books
   */
  async getAllBooks(): Promise<Book[]> {
    return apiClient.get<Book[]>('/books');
  }

  /**
   * Get a specific book by ID
   */
  async getBookById(bookId: number): Promise<Book> {
    return apiClient.get<Book>(`/books/${bookId}`);
  }

  /**
   * Get all chapters for a book
   */
  async getChaptersByBookId(bookId: number): Promise<Chapter[]> {
    return apiClient.get<Chapter[]>(`/books/${bookId}/chapters`);
  }

  /**
   * Get a specific chapter
   */
  async getChapterById(bookId: number, chapterId: number): Promise<Chapter> {
    return apiClient.get<Chapter>(`/books/${bookId}/chapters/${chapterId}`);
  }
}

export const booksService = new BooksService();
