import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Universal Storage wrapper
 * - Uses localStorage for web
 * - Uses AsyncStorage for native (iOS/Android)
 */
class UniversalStorage {
  private isWeb = Platform.OS === 'web';

  /**
   * Get item from storage
   */
  async getItem(key: string): Promise<string | null> {
    if (this.isWeb) {
      // Web: use localStorage
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('localStorage.getItem error:', error);
        return null;
      }
    } else {
      // Native: use AsyncStorage
      return AsyncStorage.getItem(key);
    }
  }

  /**
   * Set item in storage
   */
  async setItem(key: string, value: string): Promise<void> {
    if (this.isWeb) {
      // Web: use localStorage
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('localStorage.setItem error:', error);
      }
    } else {
      // Native: use AsyncStorage
      await AsyncStorage.setItem(key, value);
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    if (this.isWeb) {
      // Web: use localStorage
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('localStorage.removeItem error:', error);
      }
    } else {
      // Native: use AsyncStorage
      await AsyncStorage.removeItem(key);
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    if (this.isWeb) {
      // Web: use localStorage
      try {
        localStorage.clear();
      } catch (error) {
        console.error('localStorage.clear error:', error);
      }
    } else {
      // Native: use AsyncStorage
      await AsyncStorage.clear();
    }
  }

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<string[]> {
    if (this.isWeb) {
      // Web: use localStorage
      try {
        return Object.keys(localStorage);
      } catch (error) {
        console.error('localStorage.getAllKeys error:', error);
        return [];
      }
    } else {
      // Native: use AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      return keys as string[];
    }
  }

  /**
   * Get multiple items
   */
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    if (this.isWeb) {
      // Web: use localStorage
      try {
        return keys.map((key) => [key, localStorage.getItem(key)]);
      } catch (error) {
        console.error('localStorage.multiGet error:', error);
        return keys.map((key) => [key, null]);
      }
    } else {
      // Native: use AsyncStorage
      const result = await AsyncStorage.multiGet(keys);
      return result as [string, string | null][];
    }
  }

  /**
   * Set multiple items
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    if (this.isWeb) {
      // Web: use localStorage
      try {
        keyValuePairs.forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      } catch (error) {
        console.error('localStorage.multiSet error:', error);
      }
    } else {
      // Native: use AsyncStorage
      await AsyncStorage.multiSet(keyValuePairs);
    }
  }

  /**
   * Remove multiple items
   */
  async multiRemove(keys: string[]): Promise<void> {
    if (this.isWeb) {
      // Web: use localStorage
      try {
        keys.forEach((key) => {
          localStorage.removeItem(key);
        });
      } catch (error) {
        console.error('localStorage.multiRemove error:', error);
      }
    } else {
      // Native: use AsyncStorage
      await AsyncStorage.multiRemove(keys);
    }
  }
}

// Export singleton instance
export const storage = new UniversalStorage();

// Export for backward compatibility
export default storage;
