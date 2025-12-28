import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatsContainerProps {
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
}

export function StatsContainer({ correctCount, incorrectCount, totalQuestions }: StatsContainerProps) {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
        <Text style={styles.statValue}>{correctCount}</Text>
        <Text style={styles.statLabel}>Đúng</Text>
      </View>
      <View style={styles.statItem}>
        <Ionicons name="close-circle" size={24} color="#ef4444" />
        <Text style={styles.statValue}>{incorrectCount}</Text>
        <Text style={styles.statLabel}>Sai</Text>
      </View>
      <View style={styles.statItem}>
        <Ionicons name="help-circle" size={24} color="#6b7280" />
        <Text style={styles.statValue}>{totalQuestions}</Text>
        <Text style={styles.statLabel}>Tổng</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});
