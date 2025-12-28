import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, fontSizes } from '@/constants';

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  gradient: [string, string];
}

export function StatCard({ icon, label, value, gradient }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>
        <LinearGradient colors={gradient} style={styles.statIcon}>
          <Text style={styles.statIconText}>{icon}</Text>
        </LinearGradient>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconContainer: {
    marginBottom: spacing.md,
  },
  statIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconText: {
    fontSize: 28,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: 'bold',
    color: '#FFD700',
  },
});
