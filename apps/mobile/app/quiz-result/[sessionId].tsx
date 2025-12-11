import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuizResult } from '../../hooks/useQuizResult';
import { QuizResultHeader, ScoreCard, StatusBanner, StatsContainer, ResultActions } from '../../components/quiz-result';

export default function QuizResultScreen() {
  const { sessionId } = useLocalSearchParams();
  const { result, loading } = useQuizResult(sessionId);

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
      <QuizResultHeader passed={result.passed} />

      <View style={styles.content}>
        <ScoreCard score={result.score} totalPoints={result.total_points} percentage={result.percentage || 0} />

        <StatusBanner passed={result.passed} passingScorePercentage={result.passing_score_percentage} />

        <StatsContainer
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          totalQuestions={result.questions.length}
        />

        <ResultActions onBack={() => router.back()} onRetry={() => router.replace(`/quiz/${result.chapter_id}`)} />
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
  content: {
    flex: 1,
    padding: 20,
  },
});
