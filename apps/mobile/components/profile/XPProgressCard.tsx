import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSizes } from '@/constants';

interface XPProgressCardProps {
  nextLevelNumber?: number;
  xpProgress: number;
  totalXP: number;
  nextLevelXP?: number;
}

export function XPProgressCard({ nextLevelNumber, xpProgress, totalXP, nextLevelXP }: XPProgressCardProps) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>{nextLevelNumber ? `Tiến độ cấp ${nextLevelNumber}` : 'Cấp tối đa'}</Text>
        <Text style={styles.progressPercentage}>{Math.round(xpProgress)}%</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${xpProgress}%` }]} />
      </View>
      <View style={styles.progressFooter}>
        <Text style={styles.progressXP}>{totalXP} XP</Text>
        <Text style={styles.progressXP}>{nextLevelXP || totalXP} XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: fontSizes.base,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  progressPercentage: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 6,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressXP: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
