import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/constants';
import { storage } from '../../../utils/storage';

const STORAGE_KEY_TOKEN = '@quiz_game:auth_token';

interface BookIconProps {
  initial: string;
  gradientColors: [string, string];
  coverImage?: string; // Cover image URL
}

const BookIconComponent: React.FC<BookIconProps> = ({ initial, gradientColors, coverImage }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const token = await storage.getItem(STORAGE_KEY_TOKEN);
      setAuthToken(token);
    };
    fetchToken();
  }, []);

  return (
    <View style={styles.bookIconContainer}>
      <LinearGradient colors={gradientColors} style={styles.bookIcon}>
        {coverImage ? (
          // Show cover image if available
          <Image
            source={{
              uri: coverImage,
              headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
            }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          // Fallback to initial letter
          <View style={styles.bookIconInner}>
            <Text style={styles.bookIconText}>{initial}</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

// Memoize to prevent unnecessary re-renders when props don't change
export const BookIcon = React.memo(BookIconComponent);

const styles = StyleSheet.create({
  bookIconContainer: {
    marginRight: spacing.md,
  },
  bookIcon: {
    width: 90,
    height: 120,
    borderRadius: 12,
    padding: 3,
  },
  bookIconInner: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookIconText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
});
