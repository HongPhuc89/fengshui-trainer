import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ResultActionsProps {
  onBack: () => void;
  onRetry: () => void;
}

export function ResultActions({ onBack, onRetry }: ResultActionsProps) {
  return (
    <View style={styles.actions}>
      <TouchableOpacity style={styles.primaryButton} onPress={onBack}>
        <Text style={styles.primaryButtonText}>Quay lại</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onRetry}>
        <Ionicons name="refresh" size={20} color="#6366f1" />
        <Text style={styles.secondaryButtonText}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
});
