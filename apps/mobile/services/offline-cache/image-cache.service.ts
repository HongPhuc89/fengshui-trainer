import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = FileSystem.documentDirectory + 'image_cache/';
const METADATA_KEY = '@image_cache:metadata';
const MAX_CACHED_IMAGES = 10;

interface ImageCacheMetadata {
  [imageUrl: string]: {
    url: string;
    localPath: string;
    cachedAt: string;
    lastAccessedAt: string;
    size: number;
  };
}

class ImageCacheService {
  private async ensureCacheDir(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        console.log('[ImageCache] Created cache directory');
      }
    } catch (error) {
      console.error('[ImageCache] Failed to create cache dir:', error);
      throw error;
    }
  }

  private async loadMetadata(): Promise<ImageCacheMetadata> {
    try {
      const data = await AsyncStorage.getItem(METADATA_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('[ImageCache] Failed to load metadata:', error);
      return {};
    }
  }

  private async saveMetadata(metadata: ImageCacheMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('[ImageCache] Failed to save metadata:', error);
    }
  }

  private async evictOldImages(metadata: ImageCacheMetadata): Promise<void> {
    const images = Object.values(metadata);

    if (images.length <= MAX_CACHED_IMAGES) {
      return;
    }

    // Sort by lastAccessedAt (oldest first)
    const sortedImages = images.sort(
      (a, b) => new Date(a.lastAccessedAt).getTime() - new Date(b.lastAccessedAt).getTime(),
    );

    const toRemove = images.length - MAX_CACHED_IMAGES;
    const imagesToDelete = sortedImages.slice(0, toRemove);

    console.log(`[ImageCache] Evicting ${toRemove} old images to maintain ${MAX_CACHED_IMAGES} image limit`);

    for (const image of imagesToDelete) {
      try {
        await FileSystem.deleteAsync(image.localPath, { idempotent: true });
        delete metadata[image.url];
        console.log('[ImageCache] Evicted:', image.url);
      } catch (error) {
        console.warn('[ImageCache] Failed to evict image:', error);
      }
    }
  }

  private getLocalFileName(url: string): string {
    // Extract filename from URL or create hash-based name
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const fileName = lastPart.split('?')[0]; // Remove query params
    const timestamp = Date.now();
    return `${timestamp}_${fileName}`;
  }

  async getCachedImage(imageUrl: string): Promise<string | null> {
    try {
      const metadata = await this.loadMetadata();
      const cached = metadata[imageUrl];

      if (!cached) {
        return null;
      }

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
      if (!fileInfo.exists) {
        console.log('[ImageCache] Cached image file does not exist');
        delete metadata[imageUrl];
        await this.saveMetadata(metadata);
        return null;
      }

      // Update last accessed time
      cached.lastAccessedAt = new Date().toISOString();
      await this.saveMetadata(metadata);

      console.log('[ImageCache] Using cached image');
      return cached.localPath;
    } catch (error) {
      console.error('[ImageCache] Error getting cached image:', error);
      return null;
    }
  }

  async cacheImage(imageUrl: string): Promise<string> {
    try {
      await this.ensureCacheDir();

      const fileName = this.getLocalFileName(imageUrl);
      const localPath = `${CACHE_DIR}${fileName}`;

      console.log('[ImageCache] Downloading image:', imageUrl);

      // Download image
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      console.log('[ImageCache] Download complete');

      // Get file size (safely handle different FileInfo types)
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const size = 'size' in fileInfo ? fileInfo.size : 0;

      // Update metadata
      const metadata = await this.loadMetadata();

      metadata[imageUrl] = {
        url: imageUrl,
        localPath,
        cachedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        size,
      };

      // Evict old images if cache is too large
      await this.evictOldImages(metadata);

      await this.saveMetadata(metadata);

      console.log('[ImageCache] Image cached successfully');

      return localPath;
    } catch (error) {
      console.error('[ImageCache] Failed to cache image:', error);
      throw error;
    }
  }

  async getImage(imageUrl: string): Promise<string> {
    try {
      // Try to get from cache first
      const cachedPath = await this.getCachedImage(imageUrl);
      if (cachedPath) {
        return cachedPath;
      }

      // Cache miss, download and cache
      console.log('[ImageCache] Cache miss, downloading');
      return await this.cacheImage(imageUrl);
    } catch (error) {
      console.error('[ImageCache] Failed to get image:', error);
      // Return original URL as fallback
      return imageUrl;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await AsyncStorage.removeItem(METADATA_KEY);
      console.log('[ImageCache] Cache cleared');
    } catch (error) {
      console.error('[ImageCache] Failed to clear cache:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const metadata = await this.loadMetadata();
      return Object.values(metadata).reduce((total, item) => total + item.size, 0);
    } catch (error) {
      console.error('[ImageCache] Failed to get cache size:', error);
      return 0;
    }
  }
}

export const imageCacheService = new ImageCacheService();
