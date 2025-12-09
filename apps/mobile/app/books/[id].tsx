import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, spacing } from '@/constants';
import { booksService } from '@/modules/shared/services/api';
import { Book, Chapter } from '@/modules/shared/services/api/types';

const { width } = Dimensions.get('window');

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookData();
  }, [id]);

  const loadBookData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const bookId = parseInt(id as string);

      const [bookData, chaptersData] = await Promise.all([
        booksService.getBookById(bookId),
        booksService.getChaptersByBookId(bookId),
      ]);

      setBook(bookData);
      setChapters(chaptersData);
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin sách');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionPress = (action: string) => {
    console.log(`Action pressed: ${action} for book ${id}`);
    // TODO: Navigate to respective screens
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.red} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !book) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.primary.red} />
          <Text style={styles.errorText}>{error || 'Không tìm thấy sách'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBookData}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate estimated study time (assuming 5 minutes per chapter)
  const estimatedHours = Math.floor((chapters.length * 5) / 60);
  const estimatedMinutes = (chapters.length * 5) % 60;
  const estimatedTime =
    estimatedHours > 0 ? `${estimatedHours} giờ ${estimatedMinutes} phút` : `${estimatedMinutes} phút`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.neutral.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {book.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Book Info Section */}
        <View style={styles.bookInfoSection}>
          {/* Book Cover */}
          <View style={styles.coverContainer}>
            {book.coverImage ? (
              <Image source={{ uri: book.coverImage }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderCover}>
                <Text style={styles.placeholderIcon}>📚</Text>
                <Text style={styles.placeholderTitle} numberOfLines={3}>
                  {book.title}
                </Text>
              </View>
            )}
          </View>

          {/* Book Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.bookTitle}>{book.title}</Text>
            {book.author && <Text style={styles.bookAuthor}>{book.author}</Text>}

            {/* Study Info */}
            <View style={styles.studyInfoContainer}>
              <View style={styles.studyInfoItem}>
                <Ionicons name="book-outline" size={20} color={colors.secondary.gold} />
                <Text style={styles.studyInfoText}>{chapters.length} chương</Text>
              </View>
              <View style={styles.studyInfoItem}>
                <Ionicons name="time-outline" size={20} color={colors.secondary.gold} />
                <Text style={styles.studyInfoText}>{estimatedTime} học</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>Tiến độ học tập</Text>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: '0%' }]} />
              </View>
              <Text style={styles.progressText}>0% hoàn thành</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {book.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Mô tả</Text>
            <Text style={styles.descriptionText}>{book.description}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Công cụ học tập</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleActionPress('summary')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#4A9B8E' }]}>
              <Ionicons name="document-text" size={24} color={colors.neutral.white} />
            </View>
            <Text style={styles.actionText}>Tóm tắt</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleActionPress('quiz')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#4A9B8E' }]}>
              <Ionicons name="help-circle" size={24} color={colors.neutral.white} />
            </View>
            <Text style={styles.actionText}>Quiz</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleActionPress('flashcards')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#4A9B8E' }]}>
              <Ionicons name="layers" size={24} color={colors.neutral.white} />
            </View>
            <Text style={styles.actionText}>Flashcards</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleActionPress('chat')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#4A9B8E' }]}>
              <Ionicons name="chatbubbles" size={24} color={colors.neutral.white} />
            </View>
            <Text style={styles.actionText}>Hỏi đáp với sách</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleActionPress('mindmap')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5F3' }]}>
              <Ionicons name="git-network" size={24} color="#4A9B8E" />
            </View>
            <Text style={styles.actionText}>Mindmap</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral.gray[400]} />
          </TouchableOpacity>
        </View>

        {/* Chapters List */}
        {chapters.length > 0 && (
          <View style={styles.chaptersSection}>
            <Text style={styles.sectionTitle}>Danh sách chương</Text>
            {chapters.map((chapter, index) => (
              <TouchableOpacity
                key={chapter.id}
                style={styles.chapterItem}
                onPress={() => console.log('Chapter pressed:', chapter.id)}
                activeOpacity={0.7}
              >
                <View style={styles.chapterNumber}>
                  <Text style={styles.chapterNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.chapterInfo}>
                  <Text style={styles.chapterTitle} numberOfLines={2}>
                    {chapter.title}
                  </Text>
                  {chapter.description && (
                    <Text style={styles.chapterDescription} numberOfLines={1}>
                      {chapter.description}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.neutral.gray[400]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray[50],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray[200],
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.neutral.gray[900],
  },
  headerSpacer: {
    width: 40,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: colors.neutral.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: colors.neutral.gray[700],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary.red,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.neutral.white,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },

  // Book Info Section
  bookInfoSection: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray[200],
  },
  coverContainer: {
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFD93D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  placeholderIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  placeholderTitle: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.neutral.gray[900],
    textAlign: 'center',
  },
  detailsContainer: {
    flex: 1,
  },
  bookTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.neutral.gray[900],
    marginBottom: spacing.xs,
  },
  bookAuthor: {
    fontSize: fontSizes.sm,
    color: colors.neutral.gray[600],
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },

  // Study Info
  studyInfoContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  studyInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  studyInfoText: {
    marginLeft: spacing.xs,
    fontSize: fontSizes.sm,
    color: colors.neutral.gray[700],
    fontWeight: '500',
  },

  // Progress
  progressSection: {
    marginTop: spacing.sm,
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
  progressText: {
    marginTop: spacing.xs,
    fontSize: fontSizes.xs,
    color: colors.neutral.gray[600],
  },

  // Description Section
  descriptionSection: {
    padding: spacing.lg,
    backgroundColor: colors.neutral.white,
    marginTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray[200],
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.neutral.gray[900],
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: fontSizes.base,
    color: colors.neutral.gray[700],
    lineHeight: 24,
  },

  // Actions Section
  actionsSection: {
    padding: spacing.lg,
    backgroundColor: colors.neutral.white,
    marginTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray[200],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.gray[200],
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: '500',
    color: colors.neutral.gray[900],
  },

  // Chapters Section
  chaptersSection: {
    padding: spacing.lg,
    backgroundColor: colors.neutral.white,
    marginTop: spacing.sm,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray[100],
  },
  chapterNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  chapterNumberText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#4A9B8E',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: fontSizes.base,
    fontWeight: '500',
    color: colors.neutral.gray[900],
    marginBottom: spacing.xs / 2,
  },
  chapterDescription: {
    fontSize: fontSizes.sm,
    color: colors.neutral.gray[600],
  },

  // Bottom Spacing
  bottomSpacer: {
    height: spacing.xl,
  },
});
