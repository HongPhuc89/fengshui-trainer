import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/constants';
import { BookIcon } from './BookIcon';
import { BookInfo } from './BookInfo';

interface BookCardProps {
  title: string;
  category: string;
  description: string;
  chapterCount: number;
  initial: string;
  gradientColors: [string, string];
  onPress: () => void;
  index: number; // For staggered animation
}

const BookCardComponent: React.FC<BookCardProps> = ({
  title,
  category,
  description,
  chapterCount,
  initial,
  gradientColors,
  onPress,
  index,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100, // Stagger by 100ms per card
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.bookCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
          style={styles.bookCardGradient}
        >
          <BookIcon initial={initial} gradientColors={gradientColors} />
          <BookInfo title={title} category={category} description={description} chapterCount={chapterCount} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Memoize to prevent unnecessary re-renders
// Custom comparison function to handle array props
export const BookCard = React.memo(BookCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.category === nextProps.category &&
    prevProps.description === nextProps.description &&
    prevProps.chapterCount === nextProps.chapterCount &&
    prevProps.initial === nextProps.initial &&
    prevProps.gradientColors[0] === nextProps.gradientColors[0] &&
    prevProps.gradientColors[1] === nextProps.gradientColors[1] &&
    prevProps.index === nextProps.index
  );
});

const styles = StyleSheet.create({
  animatedContainer: {
    marginBottom: spacing.sm,
  },
  bookCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bookCardGradient: {
    flexDirection: 'row',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
});
