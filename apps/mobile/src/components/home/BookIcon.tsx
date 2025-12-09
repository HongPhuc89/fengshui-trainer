import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/constants';

interface BookIconProps {
  initial: string;
  gradientColors: [string, string];
}

const BookIconComponent: React.FC<BookIconProps> = ({ initial, gradientColors }) => {
  return (
    <View style={styles.bookIconContainer}>
      <LinearGradient colors={gradientColors} style={styles.bookIcon}>
        <View style={styles.bookIconInner}>
          <Text style={styles.bookIconText}>{initial}</Text>
        </View>
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
});
