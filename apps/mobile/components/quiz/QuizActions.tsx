import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuizActionsProps {
  isLastQuestion: boolean;
  isAnswered: boolean;
  isSubmitted: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onSubmit: () => void;
}

export function QuizActions({
  isLastQuestion,
  isAnswered,
  isSubmitted,
  isSubmitting,
  onConfirm,
  onSubmit,
}: QuizActionsProps) {
  if (isLastQuestion) {
    // Last question - show confirm first, then submit
    return (
      <>
        {!isSubmitted && isAnswered && (
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.confirmButtonText}>Xác nhận đáp án</Text>
          </TouchableOpacity>
        )}

        {isSubmitted && (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>NỘP BÀI</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </>
    );
  }

  // Other questions - show confirm button (only if not submitted)
  if (!isSubmitted && isAnswered) {
    return (
      <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} activeOpacity={0.8}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.confirmButtonText}>Xác nhận đáp án</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
