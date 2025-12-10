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

interface MultipleChoiceProps {
  options: any[];
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
}

export function MultipleChoiceQuestion({ options, selectedAnswer, onAnswer }: MultipleChoiceProps) {
  return (
    <View style={styles.container}>
      {options.map((option: any, index: number) => {
        const label = OPTION_LABELS[index];
        const color = OPTION_COLORS[label as keyof typeof OPTION_COLORS];
        const optionId = option.id || String.fromCharCode(97 + index);
        const isSelected = selectedAnswer === optionId;

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              isSelected && styles.optionButtonSelected,
              isSelected && { borderColor: color },
            ]}
            onPress={() => onAnswer(optionId)}
            activeOpacity={0.7}
          >
            <View style={[styles.optionBadge, { backgroundColor: color }]}>
              <Text style={styles.optionBadgeText}>{label}</Text>
            </View>
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.text || option}</Text>
            {isSelected && <Ionicons name="checkmark-circle" size={24} color={color} style={styles.checkIcon} />}
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
  checkIcon: {
    marginLeft: 8,
  },
});
