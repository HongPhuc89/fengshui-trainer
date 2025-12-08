/**
 * Example Component: Quiz Screen
 *
 * This example demonstrates the complete quiz workflow:
 * 1. Show quiz info
 * 2. Start quiz
 * 3. Answer questions
 * 4. Submit quiz
 * 5. Show results
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuizConfig, useQuiz } from '../hooks';
import type { QuizQuestion } from '../api';

interface QuizScreenProps {
  route: {
    params: {
      bookId: number;
      chapterId: number;
    };
  };
  navigation: any;
}

export function QuizScreen({ route, navigation }: QuizScreenProps) {
  const { bookId, chapterId } = route.params;

  // Fetch quiz configuration
  const { config, isLoading: configLoading } = useQuizConfig(bookId, chapterId);

  // Manage quiz state
  const { currentAttempt, submitResult, isLoading, startQuiz, submitQuiz, resetQuiz } = useQuiz(bookId, chapterId);

  // Track user answers
  const [answers, setAnswers] = useState<Record<number, any>>({});

  // Handle starting the quiz
  const handleStartQuiz = async () => {
    try {
      await startQuiz();
      setAnswers({});
    } catch (error) {
      Alert.alert('Error', 'Failed to start quiz. Please try again.');
    }
  };

  // Handle submitting the quiz
  const handleSubmitQuiz = async () => {
    // Check if all questions are answered
    const unansweredCount = currentAttempt?.questions.filter((q) => !answers[q.id]).length || 0;

    if (unansweredCount > 0) {
      Alert.alert('Incomplete Quiz', `You have ${unansweredCount} unanswered question(s). Submit anyway?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: submitAnswers },
      ]);
    } else {
      submitAnswers();
    }
  };

  const submitAnswers = async () => {
    try {
      await submitQuiz(answers);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit quiz. Please try again.');
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId: number, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Loading state
  if (configLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Quiz info screen (before starting)
  if (!currentAttempt && !submitResult) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.infoCard}>
          <Text style={styles.title}>Quiz Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Questions:</Text>
            <Text style={styles.infoValue}>{config?.questionCount}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Passing Score:</Text>
            <Text style={styles.infoValue}>{config?.passingScore}%</Text>
          </View>

          {config?.timeLimit && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Time Limit:</Text>
              <Text style={styles.infoValue}>{config.timeLimit} minutes</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Difficulty:</Text>
            <Text style={styles.infoValue}>
              Easy: {config?.easyPercentage}% | Medium: {config?.mediumPercentage}% | Hard: {config?.hardPercentage}%
            </Text>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={handleStartQuiz} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.startButtonText}>Start Quiz</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Results screen (after submission)
  if (submitResult) {
    const passed = submitResult.passed;

    return (
      <ScrollView style={styles.container}>
        <View style={[styles.resultCard, passed ? styles.passedCard : styles.failedCard]}>
          <Text style={styles.resultTitle}>{passed ? '🎉 Congratulations!' : '😔 Try Again'}</Text>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Your Score</Text>
            <Text style={styles.scoreValue}>{submitResult.score}%</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{submitResult.correctAnswers}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{submitResult.totalQuestions - submitResult.correctAnswers}</Text>
              <Text style={styles.statLabel}>Wrong</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{submitResult.totalQuestions}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          <View style={styles.pointsRow}>
            <Text style={styles.pointsText}>
              Points: {submitResult.earnedPoints} / {submitResult.totalPoints}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>Back to Chapter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => {
                resetQuiz();
                handleStartQuiz();
              }}
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Quiz questions screen (during quiz)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Question {Object.keys(answers).length} / {currentAttempt?.questions.length}
        </Text>
      </View>

      <ScrollView style={styles.questionsContainer}>
        {currentAttempt?.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            selectedAnswer={answers[question.id]}
            onAnswerSelect={(answer) => handleAnswerSelect(question.id, answer)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitQuiz} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Submit Quiz</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Question Card Component
interface QuestionCardProps {
  question: QuizQuestion;
  index: number;
  selectedAnswer: any;
  onAnswerSelect: (answer: any) => void;
}

function QuestionCard({ question, index, selectedAnswer, onAnswerSelect }: QuestionCardProps) {
  const renderOptions = () => {
    if (question.type === 'true_false') {
      return (
        <View style={styles.optionsContainer}>
          {[true, false].map((option) => (
            <TouchableOpacity
              key={String(option)}
              style={[styles.optionButton, selectedAnswer === option && styles.selectedOption]}
              onPress={() => onAnswerSelect(option)}
            >
              <Text style={styles.optionText}>{option ? 'True' : 'False'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // Multiple choice or multiple answer
    const options = question.options as any[];
    return (
      <View style={styles.optionsContainer}>
        {options.map((option, idx) => {
          const isSelected =
            question.type === 'multiple_answer'
              ? selectedAnswer?.includes(option.value)
              : selectedAnswer === option.value;

          return (
            <TouchableOpacity
              key={idx}
              style={[styles.optionButton, isSelected && styles.selectedOption]}
              onPress={() => {
                if (question.type === 'multiple_answer') {
                  const current = selectedAnswer || [];
                  const newAnswer = current.includes(option.value)
                    ? current.filter((v: any) => v !== option.value)
                    : [...current, option.value];
                  onAnswerSelect(newAnswer);
                } else {
                  onAnswerSelect(option.value);
                }
              }}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Question {index + 1}</Text>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{question.difficulty}</Text>
        </View>
      </View>

      <Text style={styles.questionText}>{question.question}</Text>

      {question.type === 'multiple_answer' && <Text style={styles.hintText}>Select all that apply</Text>}

      {renderOptions()}

      <Text style={styles.pointsText}>{question.points} points</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info screen
  infoCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  // Quiz screen
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  questionsContainer: {
    flex: 1,
  },
  questionCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 12,
    color: '#F57C00',
    textTransform: 'capitalize',
  },
  questionText: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionButton: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 15,
  },
  pointsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  // Results screen
  resultCard: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
  },
  passedCard: {
    backgroundColor: '#E8F5E9',
  },
  failedCard: {
    backgroundColor: '#FFEBEE',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  pointsRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
