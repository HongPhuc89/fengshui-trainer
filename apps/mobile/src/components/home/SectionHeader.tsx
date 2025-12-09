import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontSizes, spacing } from '@/constants';

interface SectionHeaderProps {
  title: string;
  subtitle: string;
}

const SectionHeaderComponent: React.FC<SectionHeaderProps> = ({ title, subtitle }) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
};

// Memoize to prevent unnecessary re-renders when props don't change
export const SectionHeader = React.memo(SectionHeaderComponent);

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
});
