import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = FileSystem.documentDirectory + 'pdf_cache/';
const METADATA_KEY = '@pdf_cache:metadata';
const MAX_CACHED_FILES = 10; // Giới hạn 10 files để tránh app quá nặng

interface CacheMetadata {
  [fileId: string]: {
    fileId: number;
    fileName: string;
    localPath: string;
    updatedAt: string;
    downloadedAt: string;
    lastAccessedAt: string; // Track last access for LRU
    size: number;
  };
}

class OfflineCacheService {
  private async ensureCacheDir(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        console.log('[OfflineCache] Created cache directory');
      }
    } catch (error) {
      console.error('[OfflineCache] Failed to create cache dir:', error);
      throw error;
    }
  }

  private async loadMetadata(): Promise<CacheMetadata> {
    try {
      const data = await AsyncStorage.getItem(METADATA_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('[OfflineCache] Failed to load metadata:', error);
      return {};
    }
  }

  private async saveMetadata(metadata: CacheMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('[OfflineCache] Failed to save metadata:', error);
    }
  }

  async isCacheValid(fileId: number, updatedAt: Date): Promise<boolean> {
    try {
      const metadata = await this.loadMetadata();
      const cached = metadata[fileId];

      if (!cached) {
        console.log('[OfflineCache] No cache found for file:', fileId);
        return false;
      }

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
      if (!fileInfo.exists) {
        console.log('[OfflineCache] Cached file does not exist');
        return false;
      }

      // Check if up-to-date
      const isValid = new Date(cached.updatedAt) >= new Date(updatedAt);
      console.log('[OfflineCache] Cache valid:', isValid);
      return isValid;
    } catch (error) {
      console.error('[OfflineCache] Error checking cache validity:', error);
      return false;
    }
  }

  private async evictOldFiles(metadata: CacheMetadata): Promise<void> {
    const files = Object.values(metadata);

    if (files.length <= MAX_CACHED_FILES) {
      return; // No need to evict
    }

    // Sort by lastAccessedAt (oldest first)
    const sortedFiles = files.sort(
      (a, b) => new Date(a.lastAccessedAt).getTime() - new Date(b.lastAccessedAt).getTime(),
    );

    // Calculate how many to remove
    const toRemove = files.length - MAX_CACHED_FILES;
    const filesToDelete = sortedFiles.slice(0, toRemove);

    console.log(`[OfflineCache] Evicting ${toRemove} old files to maintain ${MAX_CACHED_FILES} file limit`);

    // Delete files
    for (const file of filesToDelete) {
      try {
        await FileSystem.deleteAsync(file.localPath, { idempotent: true });
        delete metadata[file.fileId];
        console.log('[OfflineCache] Evicted:', file.fileName);
      } catch (error) {
        console.warn('[OfflineCache] Failed to evict file:', error);
      }
    }
  }

  async cacheFile(fileUrl: string, fileId: number, fileName: string, updatedAt: Date): Promise<string> {
    try {
      await this.ensureCacheDir();

      const timestamp = Date.now();
      const localPath = `${CACHE_DIR}${fileId}_${timestamp}.pdf`;

      console.log('[OfflineCache] Downloading file:', fileName);

      // Download file
      const downloadResult = await FileSystem.downloadAsync(fileUrl, localPath);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      console.log('[OfflineCache] Download complete');

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const size = fileInfo.size || 0;

      // Update metadata
      const metadata = await this.loadMetadata();

      // Delete old version if exists
      if (metadata[fileId]) {
        try {
          await FileSystem.deleteAsync(metadata[fileId].localPath, { idempotent: true });
          console.log('[OfflineCache] Deleted old cached file');
        } catch (error) {
          console.warn('[OfflineCache] Failed to delete old file:', error);
        }
      }

      metadata[fileId] = {
        fileId,
        fileName,
        localPath,
        updatedAt: updatedAt.toISOString(),
        downloadedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        size,
      };

      // Evict old files if cache is too large
      await this.evictOldFiles(metadata);

      await this.saveMetadata(metadata);

      console.log('[OfflineCache] File cached successfully');

      return localPath;
    } catch (error) {
      console.error('[OfflineCache] Failed to cache file:', error);
      throw error;
    }
  }

  async getFile(fileUrl: string, fileId: number, fileName: string, updatedAt: Date): Promise<string | null> {
    try {
      const isValid = await this.isCacheValid(fileId, updatedAt);

      if (isValid) {
        const metadata = await this.loadMetadata();

        // Update lastAccessedAt for LRU tracking
        metadata[fileId].lastAccessedAt = new Date().toISOString();
        await this.saveMetadata(metadata);

        console.log('[OfflineCache] Using cached file');
        return metadata[fileId].localPath;
      }

      // Download and cache
      console.log('[OfflineCache] Cache miss, downloading');
      return await this.cacheFile(fileUrl, fileId, fileName, updatedAt);
    } catch (error) {
      console.error('[OfflineCache] Failed to get file:', error);
      return null;
    }
  }

  async clearCache(fileId?: number): Promise<void> {
    try {
      const metadata = await this.loadMetadata();

      if (fileId) {
        const cached = metadata[fileId];
        if (cached) {
          await FileSystem.deleteAsync(cached.localPath, { idempotent: true });
          delete metadata[fileId];
          await this.saveMetadata(metadata);
        }
      } else {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
        await AsyncStorage.removeItem(METADATA_KEY);
      }

      console.log('[OfflineCache] Cache cleared');
    } catch (error) {
      console.error('[OfflineCache] Failed to clear cache:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const metadata = await this.loadMetadata();
      return Object.values(metadata).reduce((total, item) => total + item.size, 0);
    } catch (error) {
      console.error('[OfflineCache] Failed to get cache size:', error);
      return 0;
    }
  }
}

export const offlineCacheService = new OfflineCacheService();
