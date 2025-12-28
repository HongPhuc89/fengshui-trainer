import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface QuizHeaderProps {
  currentQuestion: number;
  totalQuestions: number;
  points: number;
}

export function QuizHeader({ currentQuestion, totalQuestions, points }: QuizHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerLabel}>CÂU HỎI</Text>
        <View style={styles.questionCounter}>
          <Text style={styles.currentQuestion}>{currentQuestion}</Text>
          <Text style={styles.totalQuestions}> / {totalQuestions}</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.headerLabel}>ĐIỂM SỐ</Text>
        <Text style={styles.scoreText}>{points}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  questionCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentQuestion: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  totalQuestions: {
    fontSize: 18,
    color: '#94a3b8',
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
});
