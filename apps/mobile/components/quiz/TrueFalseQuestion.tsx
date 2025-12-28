import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrueFalseProps {
  selectedAnswer: boolean | null;
  onAnswer: (answer: boolean) => void;
}

export function TrueFalseQuestion({ selectedAnswer, onAnswer }: TrueFalseProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.optionButton, styles.trueButton, selectedAnswer === true && styles.trueButtonSelected]}
        onPress={() => onAnswer(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, styles.trueCircle]}>
          <Ionicons name="checkmark" size={32} color="#fff" />
        </View>
        <Text style={[styles.optionText, selectedAnswer === true && styles.optionTextSelected]}>Đúng</Text>
        {selectedAnswer === true && (
          <Ionicons name="checkmark-circle" size={24} color="#10b981" style={styles.checkIcon} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionButton, styles.falseButton, selectedAnswer === false && styles.falseButtonSelected]}
        onPress={() => onAnswer(false)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, styles.falseCircle]}>
          <Ionicons name="close" size={32} color="#fff" />
        </View>
        <Text style={[styles.optionText, selectedAnswer === false && styles.optionTextSelected]}>Sai</Text>
        {selectedAnswer === false && (
          <Ionicons name="checkmark-circle" size={24} color="#ef4444" style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  trueButton: {
    borderColor: 'transparent',
  },
  trueButtonSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    borderWidth: 2,
  },
  falseButton: {
    borderColor: 'transparent',
  },
  falseButtonSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  trueCircle: {
    backgroundColor: '#10b981',
  },
  falseCircle: {
    backgroundColor: '#ef4444',
  },
  optionText: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  checkIcon: {
    marginLeft: 8,
  },
});
