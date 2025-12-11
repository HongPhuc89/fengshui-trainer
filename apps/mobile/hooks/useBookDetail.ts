import { useState, useEffect } from 'react';
import { booksService } from '../services/api';
import { Book, Chapter } from '../modules/shared/services/api/types';

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

      const [bookData, chaptersData] = await Promise.all([
        booksService.getBookById(id),
        booksService.getChaptersByBookId(id),
      ]);

      setBook(bookData);
      setChapters(chaptersData);
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
