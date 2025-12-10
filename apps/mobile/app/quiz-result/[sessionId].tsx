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

  const correctCount = result.questions.filter((q) => {
    const userAnswer = result.answers[q.id];
    return checkAnswer(q, userAnswer);
  }).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={result.passed ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']} style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={result.passed ? 'checkmark-circle' : 'close-circle'} size={80} color="#fff" />
        </View>
        <Text style={styles.resultTitle}>{result.passed ? 'Passed!' : 'Failed'}</Text>
        <Text style={styles.resultSubtitle}>
          {result.passed ? 'Congratulations! You passed the quiz.' : 'Keep practicing and try again!'}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Your Score</Text>
          <Text style={styles.scoreValue}>
            {result.score} / {result.total_points}
          </Text>
          <Text style={styles.percentageValue}>{result.percentage.toFixed(1)}%</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.statValue}>{correctCount}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="close-circle" size={24} color="#ef4444" />
            <Text style={styles.statValue}>{result.questions.length - correctCount}</Text>
            <Text style={styles.statLabel}>Wrong</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="help-circle" size={24} color="#6b7280" />
            <Text style={styles.statValue}>{result.questions.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Back to Chapter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace(`/quiz/${result.id}`)}>
            <Ionicons name="refresh" size={20} color="#6366f1" />
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function checkAnswer(question: any, userAnswer: any): boolean {
  switch (question.question_type) {
    case 'TRUE_FALSE':
      return userAnswer === question.options.correct_answer;
    case 'MULTIPLE_CHOICE':
      return userAnswer === question.options.correct_answer;
    case 'MULTIPLE_ANSWER':
      const correctAnswers = question.options.correct_answers || [];
      const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
      return (
        correctAnswers.length === userAnswers.length && correctAnswers.every((a: string) => userAnswers.includes(a))
      );
    default:
      return false;
  }
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
