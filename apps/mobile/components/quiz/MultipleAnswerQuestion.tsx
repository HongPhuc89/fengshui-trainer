import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
const OPTION_COLORS = {
  A: '#ef4444',
  B: '#3b82f6',
  C: '#10b981',
  D: '#f59e0b',
  E: '#8b5cf6',
  F: '#ec4899',
};

interface MultipleAnswerProps {
  options: any[];
  selectedAnswers: string[];
  onAnswer: (answers: string[]) => void;
}

export function MultipleAnswerQuestion({ options, selectedAnswers, onAnswer }: MultipleAnswerProps) {
  const toggleAnswer = (optionId: string) => {
    const newAnswers = selectedAnswers.includes(optionId)
      ? selectedAnswers.filter((id) => id !== optionId)
      : [...selectedAnswers, optionId];
    onAnswer(newAnswers);
  };

  return (
    <View style={styles.container}>
      <View style={styles.hint}>
        <Ionicons name="information-circle" size={16} color="#3b82f6" />
        <Text style={styles.hintText}>Chọn tất cả đáp án đúng</Text>
      </View>
      {options.map((option: any, index: number) => {
        const label = OPTION_LABELS[index];
        const color = OPTION_COLORS[label as keyof typeof OPTION_COLORS];
        const optionId = option.id || String.fromCharCode(97 + index);
        const isSelected = selectedAnswers.includes(optionId);

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              isSelected && styles.optionButtonSelected,
              isSelected && { borderColor: color },
            ]}
            onPress={() => toggleAnswer(optionId)}
            activeOpacity={0.7}
          >
            <View style={[styles.optionBadge, { backgroundColor: color }]}>
              <Text style={styles.optionBadgeText}>{label}</Text>
            </View>
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.text || option}</Text>
            <View style={[styles.checkbox, isSelected && { backgroundColor: color, borderColor: color }]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    gap: 8,
  },
  hintText: {
    fontSize: 13,
    color: '#93c5fd',
    fontWeight: '500',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
