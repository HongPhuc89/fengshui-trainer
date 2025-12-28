import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuiz } from '../../hooks/useQuiz';
import { calculateProgress } from '../../utils/quizHelpers';
import {
  QuizHeader,
  QuizProgressBar,
  QuizTimer,
  QuizFeedback,
  QuizActions,
  LockedBanner,
  QuestionRenderer,
} from '../../components/quiz';

export default function ModernQuizScreen() {
  const { chapterId } = useLocalSearchParams();
  const {
    session,
    loading,
    currentQuestionIndex,
    answers,
    submittedAnswers,
    answerFeedback,
    timeRemaining,
    submitting,
    handleSelectAnswer,
    handleConfirmAnswer,
    handleSubmitQuiz,
  } = useQuiz(chapterId);

  if (loading) {
    return (
      <LinearGradient colors={['#1e1b4b', '#312e81', '#4c1d95']} style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  if (!session) {
    return (
      <LinearGradient colors={['#1e1b4b', '#312e81', '#4c1d95']} style={styles.container}>
        <Text style={styles.errorText}>Failed to load quiz</Text>
      </LinearGradient>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const progress = calculateProgress(currentQuestionIndex, session.questions.length);
  const isLastQuestion = currentQuestionIndex === session.questions.length - 1;
  const isAnswered = answers[currentQuestion.id] !== undefined;
  const isSubmitted = submittedAnswers.has(currentQuestion.id);

  return (
    <LinearGradient colors={['#1e1b4b', '#312e81', '#4c1d95']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <QuizHeader
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={session.questions.length}
          points={currentQuestion.points}
        />

        {/* Progress Bar */}
        <QuizProgressBar progress={progress} />

        {/* Question */}
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

        {/* Render Question Type */}
        <QuestionRenderer
          question={currentQuestion}
          selectedAnswer={answers[currentQuestion.id]}
          onAnswer={handleSelectAnswer}
          isLocked={isSubmitted}
        />

        {/* Locked indicator */}
        {isSubmitted && <LockedBanner />}

        {/* Confirm Answer Button or Submit Quiz */}
        <QuizActions
          isLastQuestion={isLastQuestion}
          isAnswered={isAnswered}
          isSubmitted={isSubmitted}
          isSubmitting={submitting}
          onConfirm={handleConfirmAnswer}
          onSubmit={handleSubmitQuiz}
        />

        {/* Answer Feedback */}
        {answerFeedback && answerFeedback.questionId === currentQuestion.id && (
          <QuizFeedback isCorrect={answerFeedback.isCorrect} />
        )}

        {/* Timer */}
        <QuizTimer timeRemaining={timeRemaining} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 24,
    lineHeight: 28,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
