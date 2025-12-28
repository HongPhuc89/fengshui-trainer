import { useState, useEffect } from 'react';
import { flashcardsService } from '../api';
import type { Flashcard } from '../api';

export function useFlashcards(bookId: number, chapterId: number) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlashcards = async () => {
    if (!bookId || !chapterId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await flashcardsService.getFlashcardsByChapter(bookId, chapterId);
      setFlashcards(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashcards();
  }, [bookId, chapterId]);

  return {
    flashcards,
    isLoading,
    error,
    refetch: fetchFlashcards,
  };
}

export function useRandomFlashcards(bookId: number, chapterId: number, count: number = 5) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRandomFlashcards = async () => {
    if (!bookId || !chapterId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await flashcardsService.getRandomFlashcards(bookId, chapterId, count);
      setFlashcards(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const shuffle = async () => {
    return fetchRandomFlashcards();
  };

  useEffect(() => {
    fetchRandomFlashcards();
  }, [bookId, chapterId, count]);

  return {
    flashcards,
    isLoading,
    error,
    shuffle,
    refetch: fetchRandomFlashcards,
  };
}

export function useFlashcard(bookId: number, chapterId: number, flashcardId: number) {
  const [flashcard, setFlashcard] = useState<Flashcard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlashcard = async () => {
    if (!bookId || !chapterId || !flashcardId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await flashcardsService.getFlashcardById(bookId, chapterId, flashcardId);
      setFlashcard(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashcard();
  }, [bookId, chapterId, flashcardId]);

  return {
    flashcard,
    isLoading,
    error,
    refetch: fetchFlashcard,
  };
}
