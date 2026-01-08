import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, Chapter } from '../../modules/shared/services/api/types';

const BOOK_CACHE_KEY = '@book_cache:';
const BOOK_METADATA_KEY = '@book_cache:metadata';
const MAX_CACHED_BOOKS = 10; // Giới hạn 10 books để tránh app quá nặng

interface BookCacheData {
  book: Book;
  chapters: Chapter[];
  updatedAt: string;
  cachedAt: string;
  lastAccessedAt: string;
}

interface BookCacheMetadata {
  [bookId: string]: {
    bookId: number;
    updatedAt: string;
    cachedAt: string;
    lastAccessedAt: string;
  };
}

class BookCacheService {
  private async loadMetadata(): Promise<BookCacheMetadata> {
    try {
      const data = await AsyncStorage.getItem(BOOK_METADATA_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('[BookCache] Failed to load metadata:', error);
      return {};
    }
  }

  private async saveMetadata(metadata: BookCacheMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(BOOK_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('[BookCache] Failed to save metadata:', error);
    }
  }

  private async evictOldBooks(metadata: BookCacheMetadata): Promise<void> {
    const books = Object.values(metadata);

    if (books.length <= MAX_CACHED_BOOKS) {
      return; // No need to evict
    }

    // Sort by lastAccessedAt (oldest first)
    const sortedBooks = books.sort(
      (a, b) => new Date(a.lastAccessedAt).getTime() - new Date(b.lastAccessedAt).getTime(),
    );

    // Calculate how many to remove
    const toRemove = books.length - MAX_CACHED_BOOKS;
    const booksToDelete = sortedBooks.slice(0, toRemove);

    console.log(`[BookCache] Evicting ${toRemove} old books to maintain ${MAX_CACHED_BOOKS} book limit`);

    // Delete cached data
    for (const book of booksToDelete) {
      try {
        await AsyncStorage.removeItem(`${BOOK_CACHE_KEY}${book.bookId}`);
        delete metadata[book.bookId];
        console.log('[BookCache] Evicted book:', book.bookId);
      } catch (error) {
        console.warn('[BookCache] Failed to evict book:', error);
      }
    }
  }

  async isCacheValid(bookId: number, updatedAt: Date): Promise<boolean> {
    try {
      const metadata = await this.loadMetadata();
      const cached = metadata[bookId];

      if (!cached) {
        console.log('[BookCache] No cache found for book:', bookId);
        return false;
      }

      // Check if up-to-date
      const isValid = new Date(cached.updatedAt) >= new Date(updatedAt);
      console.log('[BookCache] Cache valid:', isValid, 'for book:', bookId);
      return isValid;
    } catch (error) {
      console.error('[BookCache] Error checking cache validity:', error);
      return false;
    }
  }

  async cacheBook(bookId: number, book: Book, chapters: Chapter[]): Promise<void> {
    try {
      const cacheData: BookCacheData = {
        book,
        chapters,
        updatedAt: book.updatedAt,
        cachedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      };

      // Save book data
      await AsyncStorage.setItem(`${BOOK_CACHE_KEY}${bookId}`, JSON.stringify(cacheData));

      // Update metadata
      const metadata = await this.loadMetadata();
      metadata[bookId] = {
        bookId,
        updatedAt: book.updatedAt,
        cachedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      };

      // Evict old books if cache is too large
      await this.evictOldBooks(metadata);

      await this.saveMetadata(metadata);

      console.log('[BookCache] Book cached successfully:', bookId);
    } catch (error) {
      console.error('[BookCache] Failed to cache book:', error);
      throw error;
    }
  }

  async getBook(bookId: number): Promise<{ book: Book; chapters: Chapter[] } | null> {
    try {
      const cacheKey = `${BOOK_CACHE_KEY}${bookId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (!cachedData) {
        console.log('[BookCache] Cache miss for book:', bookId);
        return null;
      }

      const data: BookCacheData = JSON.parse(cachedData);

      // Update lastAccessedAt for LRU tracking
      const metadata = await this.loadMetadata();
      if (metadata[bookId]) {
        metadata[bookId].lastAccessedAt = new Date().toISOString();
        await this.saveMetadata(metadata);
      }

      console.log('[BookCache] Using cached book:', bookId);
      return {
        book: data.book,
        chapters: data.chapters,
      };
    } catch (error) {
      console.error('[BookCache] Failed to get cached book:', error);
      return null;
    }
  }

  async clearCache(bookId?: number): Promise<void> {
    try {
      const metadata = await this.loadMetadata();

      if (bookId) {
        await AsyncStorage.removeItem(`${BOOK_CACHE_KEY}${bookId}`);
        delete metadata[bookId];
        await this.saveMetadata(metadata);
      } else {
        // Clear all book caches
        const keys = Object.keys(metadata);
        for (const key of keys) {
          await AsyncStorage.removeItem(`${BOOK_CACHE_KEY}${key}`);
        }
        await AsyncStorage.removeItem(BOOK_METADATA_KEY);
      }

      console.log('[BookCache] Cache cleared');
    } catch (error) {
      console.error('[BookCache] Failed to clear cache:', error);
    }
  }
}

export const bookCacheService = new BookCacheService();
