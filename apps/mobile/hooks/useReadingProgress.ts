import { useState, useEffect, useCallback, useRef } from 'react';
import { readingProgressService, ReadingProgress } from '../services/reading-progress/reading-progress.service';

export function useReadingProgress(chapterId: number) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Load initial progress
  useEffect(() => {
    loadProgress();
  }, [chapterId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const data = await readingProgressService.getProgress(chapterId);
      setProgress(data);
    } catch (error) {
      console.error('[useReadingProgress] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save progress (debounced sync to backend)
  const saveProgress = useCallback(
    async (update: Partial<ReadingProgress>) => {
      // Save to local immediately
      await readingProgressService.saveLocal(chapterId, update);

      // Update local state
      setProgress((prev) => ({
        chapterId,
        scrollPosition: update.scrollPosition ?? prev?.scrollPosition ?? 0,
        readingTimeSeconds: update.readingTimeSeconds ?? prev?.readingTimeSeconds ?? 0,
        completed: update.completed ?? prev?.completed ?? false,
        lastReadAt: new Date(),
      }));

      // Debounce sync to backend (5 seconds)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        await readingProgressService.syncToBackend(chapterId, update);
      }, 5000);
    },
    [chapterId],
  );

  // Mark as completed
  const markAsCompleted = useCallback(async () => {
    await readingProgressService.markAsCompleted(chapterId);
    setProgress((prev) => ({
      ...prev!,
      scrollPosition: 1.0,
      completed: true,
      lastReadAt: new Date(),
    }));
  }, [chapterId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    progress,
    loading,
    saveProgress,
    markAsCompleted,
    reload: loadProgress,
  };
}
