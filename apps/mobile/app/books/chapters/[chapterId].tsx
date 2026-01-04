import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChapterDetail } from '../../../hooks/useChapterDetail';
import { LoadingScreen, ErrorScreen } from '../../../components/common';
import { ChapterHeader, ActionButtons, ChapterContent, ChapterFileViewer } from '../../../components/chapter';

export default function ChapterDetailScreen() {
  const { chapterId, bookId } = useLocalSearchParams<{ chapterId: string; bookId: string }>();
  const router = useRouter();
  const { chapter, isLoading, error, loadChapterData } = useChapterDetail(chapterId, bookId);

  const handleActionPress = (actionId: string) => {
    console.log('Action pressed:', actionId, 'for chapter:', chapterId);
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

  const handleBack = () => {
    // Navigate back to book detail instead of using router.back()
    router.push(`/books/${bookId}`);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !chapter) {
    return <ErrorScreen message={error || 'Không tìm thấy chương'} onRetry={loadChapterData} />;
  }

  // Check if chapter has a file
  const hasFile = chapter.file && chapter.file.path;

  return (
    <View style={styles.container}>
      {/* Header */}
      <ChapterHeader title={chapter.title} onBack={handleBack} />

      {/* Content - Show file viewer if file exists, otherwise show text content */}
      {hasFile ? (
        <ChapterFileViewer 
          chapterId={parseInt(chapterId, 10)}
          fileUrl={chapter.file!.path} 
          fileName={chapter.file!.original_name}
          fileId={chapter.file!.id}
          fileUpdatedAt={chapter.file!.updated_at ? new Date(chapter.file!.updated_at) : undefined}
        />
      ) : (
        <ChapterContent content={chapter.content || chapter.description || 'Nội dung đang được cập nhật...'} />
      )}

      {/* Action Buttons - Fixed at bottom */}
      <ActionButtons onActionPress={handleActionPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1f3a',
  },
});
