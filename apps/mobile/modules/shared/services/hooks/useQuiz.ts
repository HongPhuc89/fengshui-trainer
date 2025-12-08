import { useState, useEffect } from 'react';
import { quizService } from '../api';
import type { QuizConfig, QuizAttempt, SubmitQuizRequest, SubmitQuizResponse } from '../api';

export function useQuizConfig(bookId: number, chapterId: number) {
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = async () => {
    if (!bookId || !chapterId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await quizService.getQuizConfig(bookId, chapterId);
      setConfig(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [bookId, chapterId]);

  return {
    config,
    isLoading,
    error,
    refetch: fetchConfig,
  };
}

export function useQuiz(bookId: number, chapterId: number) {
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitQuizResponse | null>(null);

  const startQuiz = async () => {
    if (!bookId || !chapterId) return;

    try {
      setIsLoading(true);
      setError(null);
      setSubmitResult(null);
      const attempt = await quizService.startQuiz(bookId, chapterId);
      setCurrentAttempt(attempt);
      return attempt;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const submitQuiz = async (answers: Record<number, any>) => {
    if (!bookId || !chapterId || !currentAttempt) {
      throw new Error('No active quiz attempt');
    }

    try {
      setIsLoading(true);
      setError(null);
      const data: SubmitQuizRequest = {
        attempt_id: currentAttempt.id,
        answers,
      };
      const result = await quizService.submitQuiz(bookId, chapterId, data);
      setSubmitResult(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetQuiz = () => {
    setCurrentAttempt(null);
    setSubmitResult(null);
    setError(null);
  };

  return {
    currentAttempt,
    submitResult,
    isLoading,
    error,
    startQuiz,
    submitQuiz,
    resetQuiz,
  };
}

export function useQuizHistory(bookId: number, chapterId: number) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = async () => {
    if (!bookId || !chapterId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await quizService.getAttemptHistory(bookId, chapterId);
      setAttempts(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [bookId, chapterId]);

  return {
    attempts,
    isLoading,
    error,
    refetch: fetchHistory,
  };
}

export function useQuizAttempt(bookId: number, chapterId: number, attemptId: number) {
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAttempt = async () => {
    if (!bookId || !chapterId || !attemptId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await quizService.getAttemptById(bookId, chapterId, attemptId);
      setAttempt(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempt();
  }, [bookId, chapterId, attemptId]);

  return {
    attempt,
    isLoading,
    error,
    refetch: fetchAttempt,
  };
}
