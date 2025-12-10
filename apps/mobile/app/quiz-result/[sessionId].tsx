import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { quizService, QuizResult } from '../../services/api';

export default function QuizResultScreen() {
  const { sessionId } = useLocalSearchParams();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, []);

  const fetchResult = async () => {
    try {
      const response = await quizService.getSession(Number(sessionId));
      console.log('📊 Quiz Result:', {
        score: response.score,
        total_points: response.total_points,
        percentage: response.percentage,
        passed: response.passed,
      });
      setResult(response as QuizResult);
    } catch (error) {
      console.error('Error fetching result:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!result) return null;

  // Use correct_count from backend instead of recalculating
  const correctCount = result.correct_count || 0;
  const incorrectCount = result.incorrect_count || 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={result.passed ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']} style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={result.passed ? 'checkmark-circle' : 'close-circle'} size={80} color="#fff" />
        </View>
        <Text style={styles.resultTitle}>{result.passed ? 'ĐẠT!' : 'CHƯA ĐẠT'}</Text>
        <Text style={styles.resultSubtitle}>
          {result.passed ? 'Chúc mừng! Bạn đã vượt qua bài kiểm tra.' : 'Hãy luyện tập thêm và thử lại nhé!'}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Điểm số của bạn</Text>
          <Text style={styles.scoreValue}>
            {result.score} / {result.total_points}
          </Text>
          <Text style={styles.percentageValue}>{result.percentage?.toFixed(1) || 0}%</Text>
        </View>

        {/* Pass/Fail Status Banner */}
        <View style={[styles.statusBanner, result.passed ? styles.statusBannerPass : styles.statusBannerFail]}>
          <Ionicons
            name={result.passed ? 'trophy' : 'alert-circle'}
            size={20}
            color={result.passed ? '#10b981' : '#ef4444'}
          />
          <View>
            <Text style={[styles.statusText, result.passed ? styles.statusTextPass : styles.statusTextFail]}>
              {result.passed ? `Đạt yêu cầu` : `Chưa đạt yêu cầu`}
            </Text>
            {result.passing_score_percentage && (
              <Text style={styles.passingScoreText}>Điểm chuẩn: {result.passing_score_percentage}%</Text>
            )}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.statValue}>{correctCount}</Text>
            <Text style={styles.statLabel}>Đúng</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="close-circle" size={24} color="#ef4444" />
            <Text style={styles.statValue}>{incorrectCount}</Text>
            <Text style={styles.statLabel}>Sai</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="help-circle" size={24} color="#6b7280" />
            <Text style={styles.statValue}>{result.questions.length}</Text>
            <Text style={styles.statLabel}>Tổng</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace(`/quiz/${result.chapter_id}`)}>
            <Ionicons name="refresh" size={20} color="#6366f1" />
            <Text style={styles.secondaryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
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
  content: {
    flex: 1,
    padding: 20,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  percentageValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6366f1',
  },
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
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
