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
import { LinearGradient } from 'expo-linear-gradient';
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

  const handleChapterPress = (chapterId: number) => {
    console.log('Chapter pressed:', chapterId);
    // TODO: Navigate to chapter detail
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error || !book) {
    return (
      <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#F59E0B" />
            <Text style={styles.errorText}>{error || 'Không tìm thấy sách'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadBookData}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Mock completed chapters (first 2 chapters)
  const completedChapters = [1, 2];

  return (
    <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Book Header Card */}
          <View style={styles.bookHeaderCard}>
            {/* Book Cover */}
            <View style={styles.coverContainer}>
              {book.cover_file?.path ? (
                <Image source={{ uri: book.cover_file.path }} style={styles.cover} resizeMode="cover" />
              ) : (
                <View style={styles.placeholderCover}>
                  <Ionicons name="book" size={40} color="#6B7280" />
                </View>
              )}
            </View>

            {/* Book Info */}
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              {book.author && <Text style={styles.bookAuthor}>{book.author}</Text>}

              {/* Tags */}
              <View style={styles.tagsContainer}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Tự Tiến</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Phong Thủy</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Chapters List */}
          <View style={styles.chaptersSection}>
            {chapters.map((chapter, index) => {
              const chapterNumber = index + 1;
              const isCompleted = completedChapters.includes(chapterNumber);
              const isLocked = chapterNumber > 2; // Lock chapters after 2

              // Get first 50 characters of chapter content as preview
              const contentPreview = chapter.content
                ? chapter.content.substring(0, 50).trim() + (chapter.content.length > 50 ? '...' : '')
                : chapter.description?.substring(0, 50).trim() +
                    (chapter.description && chapter.description.length > 50 ? '...' : '') || 'Nội dung chương...';

              return (
                <TouchableOpacity
                  key={chapter.id}
                  style={[styles.chapterCard, isLocked && styles.chapterCardLocked]}
                  onPress={() => !isLocked && handleChapterPress(chapter.id)}
                  activeOpacity={isLocked ? 1 : 0.7}
                  disabled={isLocked}
                >
                  {/* Chapter Number Badge */}
                  <View
                    style={[
                      styles.chapterBadge,
                      isCompleted && styles.chapterBadgeCompleted,
                      isLocked && styles.chapterBadgeLocked,
                    ]}
                  >
                    {isLocked ? (
                      <Ionicons name="lock-closed" size={18} color="#6B7280" />
                    ) : (
                      <Text style={styles.chapterBadgeText}>{chapterNumber}</Text>
                    )}
                  </View>

                  {/* Chapter Info */}
                  <View style={styles.chapterInfo}>
                    <Text style={[styles.chapterTitle, isLocked && styles.chapterTitleLocked]} numberOfLines={1}>
                      {chapter.title}
                    </Text>
                    <Text
                      style={[styles.chapterDescription, isLocked && styles.chapterDescriptionLocked]}
                      numberOfLines={1}
                    >
                      {contentPreview}
                    </Text>
                    {isLocked && (
                      <View style={styles.lockTextContainer}>
                        <Text style={styles.lockText}>Khóa - 50 lượng</Text>
                      </View>
                    )}
                  </View>

                  {/* Status Icon */}
                  {isCompleted ? (
                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  ) : isLocked ? (
                    <TouchableOpacity style={styles.unlockButton}>
                      <Text style={styles.unlockButtonText}>Mở khóa</Text>
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom Spacing for tab bar */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
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
    color: '#fff',
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
    color: '#fff',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: fontSizes.base,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },

  // Book Header Card
  bookHeaderCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  coverContainer: {
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: spacing.xs,
  },
  bookAuthor: {
    fontSize: fontSizes.sm,
    color: '#F59E0B',
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
    borderRadius: 6,
  },
  tagText: {
    fontSize: fontSizes.xs,
    color: '#D1D5DB',
    fontWeight: '500',
  },

  // Chapters Section
  chaptersSection: {
    paddingHorizontal: spacing.lg,
  },
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chapterCardLocked: {
    opacity: 0.7,
  },
  chapterBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  chapterBadgeCompleted: {
    backgroundColor: '#10B981',
  },
  chapterBadgeLocked: {
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
  },
  chapterBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  chapterTitleLocked: {
    color: '#9CA3AF',
  },
  chapterDescription: {
    fontSize: 13,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  chapterDescriptionLocked: {
    color: '#6B7280',
  },
  lockTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  lockText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  unlockButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#D97706',
    borderRadius: 8,
  },
  unlockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Bottom Spacing
  bottomSpacer: {
    height: 100, // Space for floating tab bar
  },
});
