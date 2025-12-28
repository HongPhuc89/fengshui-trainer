import { useState, useEffect } from 'react';
import { booksService } from '../api';
import type { Book, Chapter } from '../api';

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBooks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await booksService.getAllBooks();
      setBooks(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  return {
    books,
    isLoading,
    error,
    refetch: fetchBooks,
  };
}

export function useBook(bookId: number) {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBook = async () => {
    if (!bookId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await booksService.getBookById(bookId);
      setBook(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBook();
  }, [bookId]);

  return {
    book,
    isLoading,
    error,
    refetch: fetchBook,
  };
}

export function useChapters(bookId: number) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchChapters = async () => {
    if (!bookId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await booksService.getChaptersByBookId(bookId);
      setChapters(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, [bookId]);

  return {
    chapters,
    isLoading,
    error,
    refetch: fetchChapters,
  };
}

export function useChapter(bookId: number, chapterId: number) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchChapter = async () => {
    if (!bookId || !chapterId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await booksService.getChapterById(bookId, chapterId);
      setChapter(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChapter();
  }, [bookId, chapterId]);

  return {
    chapter,
    isLoading,
    error,
    refetch: fetchChapter,
  };
}
