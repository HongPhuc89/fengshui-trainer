import { useState, useEffect } from 'react';
import { mindMapService } from '../api';
import type { MindMap } from '../api';

export function useMindMap(bookId: number, chapterId: number) {
  const [mindMap, setMindMap] = useState<MindMap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMindMap = async () => {
    if (!bookId || !chapterId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await mindMapService.getMindMapByChapter(bookId, chapterId);
      setMindMap(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const exportMindMap = async () => {
    if (!bookId || !chapterId) return;

    try {
      const data = await mindMapService.exportMindMap(bookId, chapterId);
      return data;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchMindMap();
  }, [bookId, chapterId]);

  return {
    mindMap,
    isLoading,
    error,
    refetch: fetchMindMap,
    exportMindMap,
  };
}
