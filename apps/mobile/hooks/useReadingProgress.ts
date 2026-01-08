import { useState, useEffect, useCallback, useRef } from 'react';
import { readingProgressService, ReadingProgress } from '../services/reading-progress/reading-progress.service';

export function useReadingProgress(chapterId: number) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  console.log('[useReadingProgress] Hook initialized for chapter:', chapterId);

  // Load initial progress
  useEffect(() => {
    console.log('[useReadingProgress] Loading progress for chapter:', chapterId);
    loadProgress();
  }, [chapterId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      console.log('[useReadingProgress] Fetching progress...');
      const data = await readingProgressService.getProgress(chapterId);
      console.log('[useReadingProgress] Progress loaded:', data);
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
      console.log('[useReadingProgress] saveProgress called with:', update);

      // Save to local immediately
      await readingProgressService.saveLocal(chapterId, update);

      // Update local state
      setProgress((prev) => {
        const newProgress = {
          chapterId,
          scrollPosition: update.scrollPosition ?? prev?.scrollPosition ?? 0,
          readingTimeSeconds: update.readingTimeSeconds ?? prev?.readingTimeSeconds ?? 0,
          completed: update.completed ?? prev?.completed ?? false,
          lastReadAt: new Date(),
        };
        console.log('[useReadingProgress] Local state updated:', newProgress);
        return newProgress;
      });

      // Debounce sync to backend (5 seconds)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        console.log('[useReadingProgress] Cleared previous sync timeout');
      }

      syncTimeoutRef.current = setTimeout(async () => {
        console.log('[useReadingProgress] Triggering backend sync after debounce...');
        await readingProgressService.syncToBackend(chapterId, update);
      }, 5000);
    },
    [chapterId],
  );

  // Mark as completed
  const markAsCompleted = useCallback(async () => {
    console.log('[useReadingProgress] Marking chapter as completed:', chapterId);
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
        console.log('[useReadingProgress] Cleaning up sync timeout');
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
