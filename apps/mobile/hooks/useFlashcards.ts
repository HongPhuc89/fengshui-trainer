import { useState, useEffect } from 'react';
import { Animated } from 'react-native';
import { flashcardsService, Flashcard } from '../modules/shared/services/api';

export function useFlashcards(chapterId: string | string[], bookId: string | string[]) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flipAnimation] = useState(new Animated.Value(0));

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

  useEffect(() => {
    loadFlashcards();
  }, [chapterId]);

  return {
    flashcards,
    currentIndex,
    isFlipped,
    isLoading,
    error,
    flipCard,
    nextCard,
    previousCard,
    frontInterpolate,
    backInterpolate,
    loadFlashcards,
  };
}
