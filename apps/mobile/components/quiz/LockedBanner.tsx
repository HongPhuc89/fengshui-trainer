import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function LockedBanner() {
  return (
    <View style={styles.lockedBanner}>
      <Ionicons name="lock-closed" size={16} color="#10b981" />
      <Text style={styles.lockedText}>Đã xác nhận câu trả lời</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  lockedText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
});
