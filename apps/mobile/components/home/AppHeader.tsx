import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSizes } from '@/constants';

interface AppHeaderProps {
  appName: string;
  points: number;
}

export function AppHeader({ appName, points }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.appName}>{appName}</Text>
        <Text style={styles.subtitle}>Tu tiên chi lộ, bắt đầu từ đây</Text>
      </View>
      <View style={styles.pointsContainer}>
        <Text style={styles.pointsLabel}>Thiên thư</Text>
        <Text style={styles.points}>{points.toLocaleString()} 📚</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  appName: {
    fontSize: fontSizes['2xl'],
    fontWeight: 'bold',
    color: '#FFD700',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsLabel: {
    fontSize: fontSizes.xs,
    color: '#fff',
    opacity: 0.7,
  },
  points: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 2,
  },
});
