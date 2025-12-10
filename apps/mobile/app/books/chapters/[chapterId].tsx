import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSizes, spacing } from '@/constants';
import { booksService } from '@/modules/shared/services/api';
import { Chapter } from '@/modules/shared/services/api/types';

const { width, height } = Dimensions.get('window');

type ActionButton = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: string[];
};

const ACTION_BUTTONS: ActionButton[] = [
  {
    id: 'flashcard',
    label: 'Thẻ Nhớ',
    icon: 'book',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#6D28D9'],
  },
  {
    id: 'mindmap',
    label: 'Sơ Đồ',
    icon: 'git-network',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
  },
  {
    id: 'quiz',
    label: 'Thử Thách',
    icon: 'flash',
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
  },
];

export default function ChapterDetailScreen() {
  const { chapterId, bookId } = useLocalSearchParams<{ chapterId: string; bookId: string }>();
  const router = useRouter();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChapterData();
  }, [chapterId]);

  const loadChapterData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const chapterIdNum = parseInt(chapterId as string);
      const bookIdNum = parseInt(bookId as string);
      const chapterData = await booksService.getChapterById(bookIdNum, chapterIdNum);
      setChapter(chapterData);
    } catch (err: any) {
      setError(err.message || 'Không thể tải nội dung chương');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionPress = (actionId: string) => {
    console.log('Action pressed:', actionId, 'for chapter:', chapterId);
    // TODO: Navigate to respective screens
    switch (actionId) {
      case 'flashcard':
        router.push(`/flashcards/${chapterId}?bookId=${bookId}`);
        break;
      case 'mindmap':
        router.push(`/mindmap/${chapterId}?bookId=${bookId}`);
        break;
      case 'quiz':
        router.push(`/quiz/${chapterId}?bookId=${bookId}`);
        break;
    }
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

  if (error || !chapter) {
    return (
      <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#F59E0B" />
            <Text style={styles.errorText}>{error || 'Không tìm thấy chương'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadChapterData}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a1f3a', 'rgba(26, 31, 58, 0.95)']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="diamond" size={20} color="#F59E0B" style={styles.headerIcon} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {chapter.title}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#FFF8E7', '#FFFBF0']} style={styles.contentGradient}>
          <View style={styles.contentContainer}>
            <Text style={styles.chapterContent}>
              {chapter.content || chapter.description || 'Nội dung đang được cập nhật...'}
            </Text>
          </View>
        </LinearGradient>

        {/* Bottom spacing for action buttons */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Action Buttons - Fixed at bottom */}
      <View style={styles.actionButtonsContainer}>
        <LinearGradient
          colors={['rgba(107, 114, 128, 0.95)', 'rgba(75, 85, 99, 0.98)']}
          style={styles.actionButtonsGradient}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={styles.actionButtonsContent}>
              <Text style={styles.actionButtonsTitle}>CHỌN HÌNH THỨC TU LUYỆN</Text>
              <View style={styles.actionButtons}>
                {ACTION_BUTTONS.map((button) => (
                  <TouchableOpacity
                    key={button.id}
                    style={styles.actionButton}
                    onPress={() => handleActionPress(button.id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={button.gradient as [string, string, ...string[]]}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name={button.icon} size={32} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.actionButtonLabel}>{button.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1f3a',
  },

  // Header
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: '#fff',
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
  contentGradient: {
    minHeight: height - 200,
  },
  contentContainer: {
    padding: spacing.xl,
  },
  chapterContent: {
    fontSize: 16,
    lineHeight: 28,
    color: '#1F2937',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },

  // Bottom spacing
  bottomSpacer: {
    height: 180, // Space for action buttons
  },

  // Action Buttons
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionButtonsGradient: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  actionButtonsContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  actionButtonsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1D5DB',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionButtonGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  actionButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});
