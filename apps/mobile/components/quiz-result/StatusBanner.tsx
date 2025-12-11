import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatusBannerProps {
  passed: boolean;
  passingScorePercentage?: number;
}

export function StatusBanner({ passed, passingScorePercentage }: StatusBannerProps) {
  return (
    <View style={[styles.statusBanner, passed ? styles.statusBannerPass : styles.statusBannerFail]}>
      <Ionicons name={passed ? 'trophy' : 'alert-circle'} size={20} color={passed ? '#10b981' : '#ef4444'} />
      <View>
        <Text style={[styles.statusText, passed ? styles.statusTextPass : styles.statusTextFail]}>
          {passed ? `Đạt yêu cầu` : `Chưa đạt yêu cầu`}
        </Text>
        {passingScorePercentage && <Text style={styles.passingScoreText}>Điểm chuẩn: {passingScorePercentage}%</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
  },
  statusBannerPass: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  statusBannerFail: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusTextPass: {
    color: '#10b981',
  },
  statusTextFail: {
    color: '#ef4444',
  },
  passingScoreText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});
