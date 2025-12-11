import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSizes } from '@/constants';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
});
