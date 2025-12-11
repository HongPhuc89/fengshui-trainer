import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface QuizResultHeaderProps {
  passed: boolean;
}

export function QuizResultHeader({ passed }: QuizResultHeaderProps) {
  return (
    <LinearGradient colors={passed ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']} style={styles.header}>
      <View style={styles.iconContainer}>
        <Ionicons name={passed ? 'checkmark-circle' : 'close-circle'} size={80} color="#fff" />
      </View>
      <Text style={styles.resultTitle}>{passed ? 'ĐẠT!' : 'CHƯA ĐẠT'}</Text>
      <Text style={styles.resultSubtitle}>
        {passed ? 'Chúc mừng! Bạn đã vượt qua bài kiểm tra.' : 'Hãy luyện tập thêm và thử lại nhé!'}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
});
