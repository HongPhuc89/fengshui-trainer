import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, fontSizes } from '@/constants';

interface Book {
  id: number;
  title: string;
  author?: string;
  cover_file?: {
    id: number;
    path: string;
  };
  chapter_count?: number;
}

interface BooksListProps {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  onBookPress: (bookId: number) => void;
}

const gradientColors = [
  ['#8B4513', '#D2691E'], // Brown/Orange
  ['#1e3a5f', '#2c5f8d'], // Blue
  ['#4a1a4a', '#6b2d6b'], // Purple
  ['#2d4a2d', '#4a7c4a'], // Green
  ['#5f1e1e', '#8d2c2c'], // Red
];

export function BooksList({ books, isLoading, error, onBookPress }: BooksListProps) {
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  if (!books || books.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>📚 Chưa có sách nào</Text>
      </View>
    );
  }

  const getInitial = (title: string) => {
    return title.charAt(0).toUpperCase();
  };

  const getGradient = (index: number) => {
    return gradientColors[index % gradientColors.length];
  };

  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContainer}
      scrollEnabled={false}
      renderItem={({ item, index }) => (
        <TouchableOpacity style={styles.bookCard} onPress={() => onBookPress(item.id)} activeOpacity={0.8}>
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']} style={styles.cardGradient}>
            {/* Cover Section */}
            <View style={styles.coverSection}>
              {item.cover_file?.path ? (
                <Image source={{ uri: item.cover_file.path }} style={styles.cover} />
              ) : (
                <LinearGradient
                  colors={getGradient(index) as readonly [string, string, ...string[]]}
                  style={styles.placeholderCover}
                >
                  <Text style={styles.placeholderText}>{getInitial(item.title)}</Text>
                </LinearGradient>
              )}
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {item.author?.toUpperCase() || 'TÁC GIẢ'}
              </Text>
              <Text style={styles.bookDescription} numberOfLines={2}>
                Cuốn sách cơ bản nhất cho người mới bắt đầu tìm hiểu về đề lý và phong thủy.
              </Text>
              <View style={styles.chapterBadge}>
                <Text style={styles.chapterCount}>{item.chapter_count} Chương</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 200,
  },
  loadingText: {
    color: '#fff',
    marginTop: spacing.md,
    fontSize: fontSizes.base,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: fontSizes.base,
    textAlign: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: fontSizes.lg,
    opacity: 0.7,
  },
  bookCard: {
    marginBottom: spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardGradient: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  coverSection: {
    marginRight: spacing.md,
  },
  cover: {
    width: 100,
    height: 140,
    borderRadius: 12,
  },
  placeholderCover: {
    width: 100,
    height: 140,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  placeholderText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  infoSection: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bookTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: fontSizes.xs,
    color: '#FFD700',
    opacity: 0.8,
    marginBottom: 8,
    letterSpacing: 1,
  },
  bookDescription: {
    fontSize: fontSizes.sm,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 20,
    marginBottom: 8,
  },
  chapterBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chapterCount: {
    fontSize: fontSizes.xs,
    color: '#fff',
    fontWeight: '600',
  },
});
