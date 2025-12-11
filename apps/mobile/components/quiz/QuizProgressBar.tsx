import React from 'react';
import { View, StyleSheet } from 'react-native';

interface QuizProgressBarProps {
  progress: number; // 0-100
}

export function QuizProgressBar({ progress }: QuizProgressBarProps) {
  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width: `${progress}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
});
