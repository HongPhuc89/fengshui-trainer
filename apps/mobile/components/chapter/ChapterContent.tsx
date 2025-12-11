import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/constants';

const { height } = Dimensions.get('window');

interface ChapterContentProps {
  content: string;
}

export function ChapterContent({ content }: ChapterContentProps) {
  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#FFF8E7', '#FFFBF0']} style={styles.contentGradient}>
        <View style={styles.contentContainer}>
          <Text style={styles.chapterContent}>{content}</Text>
        </View>
      </LinearGradient>

      {/* Bottom spacing for action buttons */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentGradient: {
    minHeight: height - 200,
  },
  contentContainer: {
    padding: spacing.xl,
  },
  chapterContent: {
    fontSize: 16,
    lineHeight: 28,
    color: '#1F2937',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  bottomSpacer: {
    height: 180, // Space for action buttons
  },
});
