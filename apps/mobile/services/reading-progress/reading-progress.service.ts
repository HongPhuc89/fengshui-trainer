import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../modules/shared/services/api/client';

const STORAGE_PREFIX = '@reading_progress:';

export interface ReadingProgress {
  chapterId: number;
  scrollPosition: number;
  readingTimeSeconds: number;
  completed: boolean;
  lastReadAt: Date;
}

class ReadingProgressService {
  // Save to AsyncStorage immediately (local)
  async saveLocal(chapterId: number, progress: Partial<ReadingProgress>): Promise<void> {
    try {
      const key = `${STORAGE_PREFIX}${chapterId}`;
      const existing = await this.getLocal(chapterId);

      const updated: ReadingProgress = {
        chapterId,
        scrollPosition: progress.scrollPosition ?? existing?.scrollPosition ?? 0,
        readingTimeSeconds: progress.readingTimeSeconds ?? existing?.readingTimeSeconds ?? 0,
        completed: progress.completed ?? existing?.completed ?? false,
        lastReadAt: new Date(),
      };

      await AsyncStorage.setItem(key, JSON.stringify(updated));
      console.log('[ReadingProgress] Saved locally:', chapterId, updated.scrollPosition);
    } catch (error) {
      console.error('[ReadingProgress] Failed to save local:', error);
    }
  }

  // Get from AsyncStorage
  async getLocal(chapterId: number): Promise<ReadingProgress | null> {
    try {
      const key = `${STORAGE_PREFIX}${chapterId}`;
      const data = await AsyncStorage.getItem(key);

      if (!data) return null;

      const progress = JSON.parse(data);
      progress.lastReadAt = new Date(progress.lastReadAt);

      return progress;
    } catch (error) {
      console.error('[ReadingProgress] Failed to get local:', error);
      return null;
    }
  }

  // Sync to backend (debounced by caller)
  async syncToBackend(chapterId: number, progress: Partial<ReadingProgress>): Promise<void> {
    try {
      console.log('[ReadingProgress] Syncing to backend:', chapterId, progress);

      await apiClient.put(`/chapters/${chapterId}/progress`, {
        scrollPosition: progress.scrollPosition,
        readingTimeSeconds: progress.readingTimeSeconds,
        completed: progress.completed,
      });

      console.log('[ReadingProgress] Synced to backend successfully');
    } catch (error) {
      console.error('[ReadingProgress] Failed to sync to backend:', error);
      // Don't throw - we'll retry later
    }
  }

  // Get progress (local first, fallback to backend)
  async getProgress(chapterId: number): Promise<ReadingProgress | null> {
    try {
      // Try local first
      const local = await this.getLocal(chapterId);

      // Fetch from backend
      const remote = await apiClient.get<any>(`/chapters/${chapterId}/progress`);

      // Merge: use latest or max scroll position
      if (!local && !remote) return null;
      if (!local) return remote;
      if (!remote) return local;

      return this.mergeProgress(local, remote);
    } catch (error) {
      console.error('[ReadingProgress] Failed to get progress:', error);
      // Return local as fallback
      return this.getLocal(chapterId);
    }
  }

  // Merge local and remote progress
  private mergeProgress(local: ReadingProgress, remote: ReadingProgress): ReadingProgress {
    // Use the one with latest read time
    if (new Date(local.lastReadAt) > new Date(remote.lastReadAt)) {
      return local;
    }

    // Or use max scroll position
    return {
      ...remote,
      scrollPosition: Math.max(local.scrollPosition, remote.scrollPosition),
    };
  }

  // Get all user progress from backend
  async getAllProgress(): Promise<ReadingProgress[]> {
    try {
      return await apiClient.get<ReadingProgress[]>('/users/me/progress');
    } catch (error) {
      console.error('[ReadingProgress] Failed to get all progress:', error);
      return [];
    }
  }

  // Mark as completed
  async markAsCompleted(chapterId: number): Promise<void> {
    await this.saveLocal(chapterId, { scrollPosition: 1.0, completed: true });
    await this.syncToBackend(chapterId, { scrollPosition: 1.0, completed: true });
  }

  // Clear local cache
  async clearLocal(chapterId?: number): Promise<void> {
    try {
      if (chapterId) {
        await AsyncStorage.removeItem(`${STORAGE_PREFIX}${chapterId}`);
      } else {
        const keys = await AsyncStorage.getAllKeys();
        const progressKeys = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
        await AsyncStorage.multiRemove(progressKeys);
      }
    } catch (error) {
      console.error('[ReadingProgress] Failed to clear local:', error);
    }
  }
}

export const readingProgressService = new ReadingProgressService();
