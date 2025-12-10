import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { quizService, QuizSession, Question } from '../../services/api';

export default function QuizScreen() {
  const { chapterId } = useLocalSearchParams();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    startQuiz();
  }, []);

  useEffect(() => {
    if (!session || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, timeRemaining]);

  const startQuiz = async () => {
    try {
      const response = await quizService.startQuiz(Number(chapterId));
      setSession(response);

      // Calculate time remaining
      if (response.time_limit_minutes) {
        setTimeRemaining(response.time_limit_minutes * 60);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start quiz');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: any) => {
    if (!session) return;

    const currentQuestion = session.questions[currentQuestionIndex];
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);

    // Submit answer to backend
    try {
      await quizService.submitAnswer(session.id, currentQuestion.id, answer);
    } catch (error) {
      console.error('Error submitting answer:', error);
    }

    // Auto move to next question
    if (currentQuestionIndex < session.questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 300);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!session) return;

    Alert.alert('Submit Quiz', 'Are you sure you want to submit? You cannot change your answers after submission.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          try {
            setSubmitting(true);
            await quizService.completeQuiz(session.id);

            // Navigate to result screen
            router.replace({
              pathname: '/quiz-result/[sessionId]',
              params: { sessionId: session.id },
            });
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit quiz');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Starting quiz...</Text>
      </View>
    );
  }

  if (!session) return null;

  const currentQuestion = session.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={20} color={timeRemaining < 60 ? '#ef4444' : '#6366f1'} />
            <Text style={[styles.timerText, timeRemaining < 60 && styles.timerWarning]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} / {session.questions.length}
          </Text>
        </View>
      </View>

      {/* Question */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <View style={[styles.difficultyBadge, styles[`difficulty${currentQuestion.difficulty}`]]}>
              <Text style={styles.difficultyText}>{currentQuestion.difficulty}</Text>
            </View>
            <Text style={styles.pointsText}>{currentQuestion.points} points</Text>
          </View>

          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

          {/* Render options based on question type */}
          <View style={styles.optionsContainer}>
            {renderOptions(currentQuestion, answers[currentQuestion.id], handleAnswer)}
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            onPress={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
          >
            <Ionicons name="chevron-back" size={20} color={currentQuestionIndex === 0 ? '#9ca3af' : '#6366f1'} />
            <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          {currentQuestionIndex === session.questions.length - 1 ? (
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitQuiz}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Quiz</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            >
              <Text style={styles.navButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color="#6366f1" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function renderOptions(question: Question, selectedAnswer: any, onAnswer: (answer: any) => void) {
  switch (question.question_type) {
    case 'TRUE_FALSE':
      return (
        <>
          <TouchableOpacity
            style={[styles.optionButton, selectedAnswer === true && styles.optionButtonSelected]}
            onPress={() => onAnswer(true)}
          >
            <Text style={[styles.optionText, selectedAnswer === true && styles.optionTextSelected]}>True</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, selectedAnswer === false && styles.optionButtonSelected]}
            onPress={() => onAnswer(false)}
          >
            <Text style={[styles.optionText, selectedAnswer === false && styles.optionTextSelected]}>False</Text>
          </TouchableOpacity>
        </>
      );

    case 'MULTIPLE_CHOICE':
      return question.options.options.map((opt: any) => (
        <TouchableOpacity
          key={opt.id}
          style={[styles.optionButton, selectedAnswer === opt.id && styles.optionButtonSelected]}
          onPress={() => onAnswer(opt.id)}
        >
          <Text style={[styles.optionText, selectedAnswer === opt.id && styles.optionTextSelected]}>
            {opt.id.toUpperCase()}. {opt.text}
          </Text>
        </TouchableOpacity>
      ));

    case 'MULTIPLE_ANSWER':
      const selectedAnswers = selectedAnswer || [];
      return question.options.options.map((opt: any) => {
        const isSelected = selectedAnswers.includes(opt.id);
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
            onPress={() => {
              const newAnswers = isSelected
                ? selectedAnswers.filter((a: string) => a !== opt.id)
                : [...selectedAnswers, opt.id];
              onAnswer(newAnswers);
            }}
          >
            <View style={styles.checkboxContainer}>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {opt.id.toUpperCase()}. {opt.text}
              </Text>
            </View>
          </TouchableOpacity>
        );
      });

    default:
      return <Text style={styles.unsupportedText}>Question type not supported in mobile yet</Text>;
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  timerWarning: {
    color: '#ef4444',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  questionCard: {
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
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyEASY: {
    backgroundColor: '#d1fae5',
  },
  difficultyMEDIUM: {
    backgroundColor: '#fed7aa',
  },
  difficultyHARD: {
    backgroundColor: '#fecaca',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 26,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  optionButtonSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  optionText: {
    fontSize: 16,
    color: '#4b5563',
  },
  optionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  unsupportedText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 40,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  navButtonDisabled: {
    borderColor: '#e5e7eb',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
