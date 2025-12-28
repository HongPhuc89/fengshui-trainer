import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSizes, spacing } from '@/constants';
import { flashcardsService, booksService } from '@/modules/shared/services/api';
import { Flashcard } from '@/modules/shared/services/api/types';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = height * 0.6;

export default function FlashcardsScreen() {
  const { chapterId, bookId } = useLocalSearchParams<{ chapterId: string; bookId: string }>();

  const router = useRouter();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flipAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    loadFlashcards();
  }, [chapterId]);

  const loadFlashcards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const chapterIdNum = parseInt(chapterId as string);
      const bookIdNum = parseInt(bookId as string);
      const data = await flashcardsService.getFlashcardsByChapter(bookIdNum, chapterIdNum);
      setFlashcards(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải flashcards');
    } finally {
      setIsLoading(false);
    }
  };

  const flipCard = () => {
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      flipAnimation.setValue(0);
    }
  };

  const previousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      flipAnimation.setValue(0);
    }
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  if (isLoading) {
    return (
      <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Đang tải flashcards...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error || flashcards.length === 0) {
    return (
      <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Thẻ Nhớ</Text>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="albums-outline" size={64} color="#F59E0B" />
            <Text style={styles.errorText}>{error || 'Chưa có flashcards cho chương này'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadFlashcards}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thẻ Nhớ</Text>
          <View style={styles.headerRight}>
            <Text style={styles.progressText}>
              {currentIndex + 1}/{flashcards.length}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Card Container */}
        <View style={styles.cardContainer}>
          <TouchableOpacity activeOpacity={0.9} onPress={flipCard} style={styles.cardTouchable}>
            {/* Front of Card */}
            <Animated.View style={[styles.card, styles.cardFront, { transform: [{ rotateY: frontInterpolate }] }]}>
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9'] as [string, string, ...string[]]}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLabel}>
                    <Ionicons name="help-circle-outline" size={20} color="#fff" />
                    <Text style={styles.cardLabelText}>Câu hỏi</Text>
                  </View>
                  <Text style={styles.cardText}>{currentCard.question}</Text>
                  {currentCard.hint && (
                    <View style={styles.hintContainer}>
                      <Ionicons name="bulb-outline" size={16} color="#FCD34D" />
                      <Text style={styles.hintText}>{currentCard.hint}</Text>
                    </View>
                  )}
                  {currentIndex === 0 && (
                    <View style={styles.tapHint}>
                      <Ionicons name="hand-left-outline" size={20} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.tapHintText}>Chạm để lật thẻ</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Back of Card */}
            <Animated.View style={[styles.card, styles.cardBack, { transform: [{ rotateY: backInterpolate }] }]}>
              <LinearGradient
                colors={['#10B981', '#059669'] as [string, string, ...string[]]}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLabel}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.cardLabelText}>Đáp án</Text>
                  </View>
                  <Text style={styles.cardText}>{currentCard.answer}</Text>
                  {currentCard.difficulty && (
                    <View style={styles.difficultyBadge}>
                      <Text style={styles.difficultyText}>
                        {currentCard.difficulty === 'easy'
                          ? '🟢 Dễ'
                          : currentCard.difficulty === 'medium'
                            ? '🟡 Trung bình'
                            : '🔴 Khó'}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            onPress={previousCard}
            disabled={currentIndex === 0}
          >
            <Ionicons name="chevron-back" size={32} color={currentIndex === 0 ? '#6B7280' : '#fff'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.shuffleButton} onPress={flipCard}>
            <LinearGradient
              colors={['#F59E0B', '#D97706'] as [string, string, ...string[]]}
              style={styles.shuffleButtonGradient}
            >
              <Ionicons name="sync" size={24} color="#fff" />
              <Text style={styles.shuffleButtonText}>Lật thẻ</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, currentIndex === flashcards.length - 1 && styles.navButtonDisabled]}
            onPress={nextCard}
            disabled={currentIndex === flashcards.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={32}
              color={currentIndex === flashcards.length - 1 ? '#6B7280' : '#fff'}
            />
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: spacing.sm,
  },
  headerRight: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  progressText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Progress Bar
  progressBarContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
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

  // Card
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  cardTouchable: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backfaceVisibility: 'hidden',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  cardFront: {},
  cardBack: {},
  cardGradient: {
    flex: 1,
    padding: spacing.xl * 1.5,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  cardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardLabelText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#fff',
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 32,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
  },
  hintText: {
    fontSize: fontSizes.sm,
    color: '#FCD34D',
    marginLeft: spacing.xs,
    fontStyle: 'italic',
  },
  tapHint: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapHintText: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: spacing.xs,
  },
  difficultyBadge: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  difficultyText: {
    fontSize: fontSizes.sm,
    color: '#fff',
    fontWeight: '600',
  },

  // Navigation
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  shuffleButton: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  shuffleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 28,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shuffleButtonText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#fff',
    marginLeft: spacing.sm,
  },
});
