import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTime } from '../../utils/quizHelpers';

interface QuizTimerProps {
  timeRemaining: number;
}

export function QuizTimer({ timeRemaining }: QuizTimerProps) {
  const isWarning = timeRemaining < 60;

  return (
    <View style={styles.timerContainer}>
      <Ionicons name="time-outline" size={20} color={isWarning ? '#ef4444' : '#fff'} />
      <Text style={[styles.timerText, isWarning && styles.timerWarning]}>{formatTime(timeRemaining)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  timerWarning: {
    color: '#ef4444',
  },
});
