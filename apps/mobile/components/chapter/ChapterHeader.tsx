import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSizes } from '@/constants';

interface ChapterHeaderProps {
  title: string;
  onBack: () => void;
}

export function ChapterHeader({ title, onBack }: ChapterHeaderProps) {
  return (
    <LinearGradient colors={['#1a1f3a', 'rgba(26, 31, 58, 0.95)']} style={styles.header}>
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="diamond" size={20} color="#F59E0B" style={styles.headerIcon} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: '#fff',
  },
});
