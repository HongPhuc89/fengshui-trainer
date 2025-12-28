import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontSizes, spacing } from '@/constants';

interface BookInfoProps {
  title: string;
  category: string;
  description: string;
  chapterCount: number;
}

const BookInfoComponent: React.FC<BookInfoProps> = ({ title, category, description, chapterCount }) => {
  return (
    <View style={styles.bookInfo}>
      <Text style={styles.bookTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.bookCategory}>{category}</Text>
      <Text style={styles.bookDescription} numberOfLines={2}>
        {description}
      </Text>

      {/* Chapter Count Badge */}
      <View style={styles.chapterBadge}>
        <Text style={styles.chapterBadgeText}>{chapterCount} Chương</Text>
      </View>
    </View>
  );
};

// Memoize to prevent unnecessary re-renders when props don't change
export const BookInfo = React.memo(BookInfoComponent);

const styles = StyleSheet.create({
  bookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  bookCategory: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: '#FFD700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  bookDescription: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  chapterBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  chapterBadgeText: {
    fontSize: fontSizes.xs,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
