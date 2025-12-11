import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/constants';
import { useBooks, useUserExperience } from '@/modules/shared/services/hooks';
import { AppHeader, SectionHeader, BooksList } from '@/components/home';

export default function HomeScreen() {
  const router = useRouter();
  const { books, isLoading, error } = useBooks();
  const { data: userExperience } = useUserExperience();

  // Memoize the callback to prevent BooksList from re-rendering unnecessarily
  const handleBookPress = useCallback(
    (bookId: number) => {
      router.push(`/books/${bookId}`);
    },
    [router],
  );

  // Get user's total XP, default to 0 if not loaded yet
  const userXP = userExperience?.total_xp || 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradientBackground}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <AppHeader appName="Thiên Thư Các" points={userXP} />

          {/* Main Content */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Section Title */}
            <SectionHeader title="Tàng Thư Các" subtitle="Chọn bộ sách để bắt đầu con đường tu tiên." />

            {/* Books List */}
            <BooksList books={books} isLoading={isLoading} error={error} onBookPress={handleBookPress} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f3460',
  },
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
});
