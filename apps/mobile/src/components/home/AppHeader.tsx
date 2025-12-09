import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontSizes, spacing } from '@/constants';

interface AppHeaderProps {
  appName: string;
  points: number;
}

const AppHeaderComponent: React.FC<AppHeaderProps> = ({ appName, points }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.appIcon}>
          <Text style={styles.appIconText}>T</Text>
        </View>
        <Text style={styles.appName}>{appName}</Text>
      </View>
      <View style={styles.pointsContainer}>
        <Text style={styles.pointsIcon}>📚</Text>
        <Text style={styles.pointsText}>{points}</Text>
      </View>
    </View>
  );
};

// Memoize to prevent unnecessary re-renders when props don't change
export const AppHeader = React.memo(AppHeaderComponent);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  appIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  pointsIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  pointsText: {
    fontSize: fontSizes.base,
    fontWeight: 'bold',
    color: '#FFD700',
  },
});
