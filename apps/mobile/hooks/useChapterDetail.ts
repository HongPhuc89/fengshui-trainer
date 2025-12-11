import { useState, useEffect } from 'react';
import { booksService } from '../services/api';
import { Chapter } from '../modules/shared/services/api/types';

export function useChapterDetail(chapterId: string | string[], bookId: string | string[]) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChapterData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const chapterIdNum = parseInt(chapterId as string);
      const bookIdNum = parseInt(bookId as string);
      const chapterData = await booksService.getChapterById(bookIdNum, chapterIdNum);
      setChapter(chapterData);
    } catch (err: any) {
      setError(err.message || 'Không thể tải nội dung chương');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChapterData();
  }, [chapterId]);

  return {
    chapter,
    isLoading,
    error,
    loadChapterData,
  };
}
