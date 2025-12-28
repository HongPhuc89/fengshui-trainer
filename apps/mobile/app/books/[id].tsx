import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/constants';
import { useBookDetail } from '../../hooks/useBookDetail';
import { LoadingScreen, ErrorScreen, BackHeader } from '../../components/common';
import { BookHeaderCard, ChapterCard } from '../../components/book';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { book, chapters, isLoading, error, loadBookData } = useBookDetail(id);

  const handleChapterPress = (chapterId: number) => {
    console.log('Chapter pressed:', chapterId);
    router.push(`/books/chapters/${chapterId}?bookId=${id}`);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !book) {
    return <ErrorScreen message={error || 'Không tìm thấy sách'} onRetry={loadBookData} />;
  }

  // Mock completed chapters (first 2 chapters)
  const completedChapters = [1, 2];

  return (
    <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <BackHeader onBack={() => router.back()} />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Book Header Card */}
          <BookHeaderCard book={book} />

          {/* Chapters List */}
          <View style={styles.chaptersSection}>
            {chapters.map((chapter, index) => {
              const chapterNumber = index + 1;
              const isCompleted = completedChapters.includes(chapterNumber);
              const isLocked = chapterNumber > 2; // Lock chapters after 2

              return (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  chapterNumber={chapterNumber}
                  isCompleted={isCompleted}
                  isLocked={isLocked}
                  onPress={handleChapterPress}
                />
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
  content: {
    flex: 1,
  },
  chaptersSection: {
    paddingHorizontal: spacing.lg,
  },
  bottomSpacer: {
    height: 100, // Space for floating tab bar
  },
});
