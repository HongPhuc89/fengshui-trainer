import { useState, useEffect } from 'react';
import { booksService, Book, Chapter } from '../modules/shared/services/api';
import { bookCacheService } from '../services/book-cache/book-cache.service';

export function useBookDetail(bookId: string | string[]) {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const id = parseInt(bookId as string);

      // Try to get from cache first
      const cachedData = await bookCacheService.getBook(id);

      if (cachedData) {
        // Check if cache is still valid
        const isValid = await bookCacheService.isCacheValid(id, new Date(cachedData.book.updatedAt));

        if (isValid) {
          console.log('[useBookDetail] Using cached data for book:', id);
          setBook(cachedData.book);
          setChapters(cachedData.chapters);
          setIsLoading(false);
          return;
        }
      }

      // Cache miss or invalid, fetch from API
      console.log('[useBookDetail] Fetching from API for book:', id);
      const [bookData, chaptersData] = await Promise.all([
        booksService.getBookById(id),
        booksService.getChaptersByBookId(id),
      ]);

      // Map cover_file.path to coverImage for easier access
      if (bookData.cover_file?.path && !bookData.coverImage) {
        bookData.coverImage = bookData.cover_file.path;
      }

      setBook(bookData);
      setChapters(chaptersData);

      // Cache the data
      await bookCacheService.cacheBook(id, bookData, chaptersData);
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin sách');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookData();
  }, [bookId]);

  return {
    book,
    chapters,
    isLoading,
    error,
    loadBookData,
  };
}
