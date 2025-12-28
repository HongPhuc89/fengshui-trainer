import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScoreCardProps {
  score: number;
  totalPoints: number;
  percentage: number;
}

export function ScoreCard({ score, totalPoints, percentage }: ScoreCardProps) {
  return (
    <View style={styles.scoreCard}>
      <Text style={styles.scoreLabel}>Điểm số của bạn</Text>
      <Text style={styles.scoreValue}>
        {score} / {totalPoints}
      </Text>
      <Text style={styles.percentageValue}>{percentage.toFixed(1)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  percentageValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6366f1',
  },
});
