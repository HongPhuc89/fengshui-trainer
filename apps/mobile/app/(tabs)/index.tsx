import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GradientBackground, Card } from '@/components/ui';
import { colors, fontSizes, spacing } from '@/constants';
import { useBooks } from '@/modules/shared/services/hooks';

export default function HomeScreen() {
  const router = useRouter();
  const { books, isLoading, error } = useBooks();

  const handleContinueReading = (bookId: number) => {
    // TODO: Navigate to book detail or continue reading
    console.log('Continue reading book:', bookId);
    // router.push(`/books/${bookId}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GradientBackground variant="redGold" style={styles.header}>
        <Text style={styles.greeting}>Xin chào! 👋</Text>
        <Text style={styles.subtitle}>Sẵn sàng học tập hôm nay?</Text>
      </GradientBackground>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Sách nổi bật</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.red} />
              <Text style={styles.loadingText}>Đang tải sách...</Text>
            </View>
          ) : error ? (
            <Card padding="lg">
              <Text style={styles.errorText}>Không thể tải sách</Text>
              <Text style={styles.errorMessage}>{error.message}</Text>
            </Card>
          ) : books.length === 0 ? (
            <Card padding="lg">
              <Text style={styles.emptyText}>Chưa có sách nào</Text>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.booksContainer}>
              {books.map((book) => (
                <View key={book.id} style={styles.bookCard}>
                  {/* Book Cover */}
                  <View style={styles.bookCoverContainer}>
                    {book.coverImage ? (
                      <Image source={{ uri: book.coverImage }} style={styles.bookCover} resizeMode="cover" />
                    ) : (
                      <View style={styles.placeholderCover}>
                        <Text style={styles.placeholderIcon}>📚</Text>
                        <Text style={styles.placeholderTitle} numberOfLines={3}>
                          {book.title}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Book Title */}
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {book.title}
                  </Text>

                  {book.author && (
                    <Text style={styles.bookAuthor} numberOfLines={1}>
                      {book.author}
                    </Text>
                  )}

                  {/* Progress */}
                  <View style={styles.progressContainer}>
                    <Text style={styles.progressLabel}>Tiến độ: 45%</Text>
                    <View style={styles.progressBarBackground}>
                      <View style={[styles.progressBarFill, { width: '45%' }]} />
                    </View>
                  </View>

                  {/* Continue Button */}
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={() => handleContinueReading(book.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.continueButtonText}>Tiếp tục học</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📂 Danh mục</Text>
          <Card padding="lg">
            <Text style={styles.comingSoonText}>Coming soon...</Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray[50],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  greeting: {
    fontSize: fontSizes['2xl'],
    fontWeight: 'bold',
    color: colors.neutral.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.neutral.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.neutral.gray[900],
    marginBottom: spacing.md,
  },

  // Loading & Error States
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.neutral.gray[600],
  },
  errorText: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: colors.primary.red,
    marginBottom: spacing.xs,
  },
  errorMessage: {
    fontSize: fontSizes.sm,
    color: colors.neutral.gray[600],
  },
  emptyText: {
    fontSize: fontSizes.base,
    color: colors.neutral.gray[600],
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: fontSizes.base,
    color: colors.neutral.gray[500],
    textAlign: 'center',
  },

  // Books Container
  booksContainer: {
    paddingRight: spacing.lg,
  },

  // Book Card
  bookCard: {
    width: 200,
    marginRight: spacing.md,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Book Cover
  bookCoverContainer: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  bookCover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFD93D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  placeholderTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.neutral.gray[900],
    textAlign: 'center',
  },

  // Book Info
  bookTitle: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: colors.neutral.gray[900],
    marginBottom: spacing.xs,
    minHeight: 40,
  },
  bookAuthor: {
    fontSize: fontSizes.sm,
    color: colors.neutral.gray[600],
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },

  // Progress
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressLabel: {
    fontSize: fontSizes.sm,
    color: colors.neutral.gray[700],
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.neutral.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4A9B8E',
    borderRadius: 4,
  },

  // Continue Button
  continueButton: {
    backgroundColor: '#4A9B8E',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.neutral.white,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
});
