import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { fontSizes, spacing } from '@/constants';
import { Book } from '@/modules/shared/services/api/types';
import { BookCard } from './BookCard';

interface BooksListProps {
  books: Book[];
  isLoading: boolean;
  error: Error | null;
  onBookPress: (bookId: number) => void;
}

// Helper function to get first letter of book title
const getBookInitial = (title: string): string => {
  return title.charAt(0).toUpperCase();
};

// Helper function to get category label (you can customize this based on your data)
const getCategoryLabel = (index: number): string => {
  const categories = ['THÀNH Ở TỪ', 'PHỤC HY', 'TRẤN ĐOÀN', 'TU TIÊN', 'HUYỀN HUYỄN'];
  return categories[index % categories.length];
};

// Helper function to get gradient colors for book icons
const getIconGradient = (index: number): [string, string] => {
  const gradients: [string, string][] = [
    ['#8B4513', '#D2691E'], // Brown
    ['#2C5F7C', '#4A8FB0'], // Blue
    ['#5B4B8A', '#8B7AB8'], // Purple
    ['#C17817', '#E8A84D'], // Gold
    ['#6B4423', '#A0522D'], // Sienna
  ];
  return gradients[index % gradients.length];
};

const BooksListComponent: React.FC<BooksListProps> = ({ books, isLoading, error, onBookPress }) => {
  // Memoize processed book data to avoid recalculating on every render
  const processedBooks = useMemo(() => {
    return books.map((book, index) => ({
      ...book,
      initial: getBookInitial(book.title),
      category: getCategoryLabel(index),
      gradientColors: getIconGradient(index),
      chapterCount: Math.floor(Math.random() * 8) + 3,
      description: book.description || 'Cuốn sách cơ bản nhất cho người mới bắt đầu tìm hiểu về địa lý và phong thủy.',
    }));
  }, [books]);

  // Memoize the press handler to prevent recreating on every render
  const handleBookPress = useCallback(
    (bookId: number) => {
      onBookPress(bookId);
    },
    [onBookPress],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Đang tải sách...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không thể tải sách</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  if (books.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Chưa có sách nào</Text>
      </View>
    );
  }

  return (
    <View style={styles.booksContainer}>
      {processedBooks.map((book, index) => (
        <BookCard
          key={book.id}
          title={book.title}
          category={book.category}
          description={book.description}
          chapterCount={book.chapterCount}
          initial={book.initial}
          gradientColors={book.gradientColors}
          index={index}
          onPress={() => handleBookPress(book.id)}
        />
      ))}
    </View>
  );
};

// Memoize the entire list component
export const BooksList = React.memo(BooksListComponent);

const styles = StyleSheet.create({
  // Loading & Error States
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: spacing.xs,
  },
  errorMessage: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes.base,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },

  // Books Container
  booksContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
});
