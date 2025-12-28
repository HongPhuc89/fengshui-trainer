import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuizFeedbackProps {
  isCorrect: boolean;
}

export function QuizFeedback({ isCorrect }: QuizFeedbackProps) {
  return (
    <View style={[styles.feedbackBanner, isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
      <Ionicons name={isCorrect ? 'checkmark-circle' : 'close-circle'} size={32} color="#fff" />
      <Text style={styles.feedbackText}>{isCorrect ? 'Chính xác!' : 'Chưa đúng!'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 24,
  },
  feedbackCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  feedbackIncorrect: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  feedbackText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
});
