import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSizes } from '@/constants';
import { Chapter } from '@/modules/shared/services/api/types';

interface ChapterCardProps {
  chapter: Chapter;
  chapterNumber: number;
  isCompleted: boolean;
  isLocked: boolean;
  onPress: (chapterId: number) => void;
}

export function ChapterCard({ chapter, chapterNumber, isCompleted, isLocked, onPress }: ChapterCardProps) {
  // Get first 50 characters of chapter content as preview
  const contentPreview = chapter.content
    ? chapter.content.substring(0, 50).trim() + (chapter.content.length > 50 ? '...' : '')
    : chapter.description?.substring(0, 50).trim() +
        (chapter.description && chapter.description.length > 50 ? '...' : '') || 'Nội dung chương...';

  return (
    <TouchableOpacity
      style={[styles.chapterCard, isLocked && styles.chapterCardLocked]}
      onPress={() => !isLocked && onPress(chapter.id)}
      activeOpacity={isLocked ? 1 : 0.7}
      disabled={isLocked}
    >
      {/* Chapter Number Badge */}
      <View
        style={[
          styles.chapterBadge,
          isCompleted && styles.chapterBadgeCompleted,
          isLocked && styles.chapterBadgeLocked,
        ]}
      >
        {isLocked ? (
          <Ionicons name="lock-closed" size={18} color="#6B7280" />
        ) : (
          <Text style={styles.chapterBadgeText}>{chapterNumber}</Text>
        )}
      </View>

      {/* Chapter Info */}
      <View style={styles.chapterInfo}>
        <Text style={[styles.chapterTitle, isLocked && styles.chapterTitleLocked]} numberOfLines={1}>
          {chapter.title}
        </Text>
        <Text style={[styles.chapterDescription, isLocked && styles.chapterDescriptionLocked]} numberOfLines={1}>
          {contentPreview}
        </Text>
        {isLocked && (
          <View style={styles.lockTextContainer}>
            <Text style={styles.lockText}>Khóa - 50 lượng</Text>
          </View>
        )}
      </View>

      {/* Status Icon */}
      {isCompleted ? (
        <Ionicons name="checkmark-circle" size={28} color="#10B981" />
      ) : isLocked ? (
        <TouchableOpacity style={styles.unlockButton}>
          <Text style={styles.unlockButtonText}>Mở khóa</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chapterCardLocked: {
    opacity: 0.7,
  },
  chapterBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  chapterBadgeCompleted: {
    backgroundColor: '#10B981',
  },
  chapterBadgeLocked: {
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
  },
  chapterBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  chapterTitleLocked: {
    color: '#9CA3AF',
  },
  chapterDescription: {
    fontSize: 13,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  chapterDescriptionLocked: {
    color: '#6B7280',
  },
  lockTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  lockText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  unlockButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#D97706',
    borderRadius: 8,
  },
  unlockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
