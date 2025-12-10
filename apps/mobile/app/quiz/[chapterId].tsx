import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { quizService, QuizSession, Question } from '../../services/api';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
const OPTION_COLORS = {
  A: '#ef4444', // red
  B: '#3b82f6', // blue
  C: '#10b981', // green
  D: '#f59e0b', // amber
  E: '#8b5cf6', // purple
  F: '#ec4899', // pink
};

export default function ModernQuizScreen() {
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

    try {
      await quizService.submitAnswer(session.id, currentQuestion.id, answer);
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!session) return;

    Alert.alert('Nộp bài', 'Bạn có chắc muốn nộp bài? Bạn không thể thay đổi câu trả lời sau khi nộp.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Nộp bài',
        onPress: async () => {
          try {
            setSubmitting(true);
            await quizService.completeQuiz(session.id);

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

  const renderOption = (option: any, index: number, isSelected: boolean, onSelect: () => void) => {
    const label = OPTION_LABELS[index];
    const color = OPTION_COLORS[label as keyof typeof OPTION_COLORS];

    return (
      <TouchableOpacity
        key={index}
        style={[styles.optionButton, isSelected && styles.optionButtonSelected, isSelected && { borderColor: color }]}
        onPress={onSelect}
        activeOpacity={0.7}
      >
        <View style={[styles.optionBadge, { backgroundColor: color }]}>
          <Text style={styles.optionBadgeText}>{label}</Text>
        </View>
        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.text || option}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color={color} style={styles.checkIcon} />}
      </TouchableOpacity>
    );
  };

  const renderOptions = (question: Question, selectedAnswer: any, onAnswer: (answer: any) => void) => {
    const options = question.options?.options || [];

    switch (question.question_type) {
      case 'TRUE_FALSE':
        return (
          <View style={styles.optionsWrapper}>
            {renderOption('Đúng', 0, selectedAnswer === true, () => onAnswer(true))}
            {renderOption('Sai', 1, selectedAnswer === false, () => onAnswer(false))}
          </View>
        );

      case 'MULTIPLE_CHOICE':
        return (
          <View style={styles.optionsWrapper}>
            {options.map((option: any, index: number) => {
              const optionId = option.id || String.fromCharCode(97 + index); // a, b, c, d
              const isSelected = selectedAnswer === optionId;
              return renderOption(option, index, isSelected, () => onAnswer(optionId));
            })}
          </View>
        );

      case 'MULTIPLE_ANSWER':
        const selectedAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : [];
        return (
          <View style={styles.optionsWrapper}>
            {options.map((option: any, index: number) => {
              const optionId = option.id || String.fromCharCode(97 + index);
              const isSelected = selectedAnswers.includes(optionId);
              return renderOption(option, index, isSelected, () => {
                const newAnswers = isSelected
                  ? selectedAnswers.filter((id: string) => id !== optionId)
                  : [...selectedAnswers, optionId];
                onAnswer(newAnswers);
              });
            })}
          </View>
        );

      default:
        return <Text style={styles.unsupportedText}>Unsupported question type</Text>;
    }
  };

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
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100;

  return (
    <LinearGradient colors={['#1e1b4b', '#312e81', '#4c1d95']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>CÂU HỎI</Text>
            <View style={styles.questionCounter}>
              <Text style={styles.currentQuestion}>{currentQuestionIndex + 1}</Text>
              <Text style={styles.totalQuestions}> / {session.questions.length}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>ĐIỂM SỐ</Text>
            <Text style={styles.scoreText}>{currentQuestion.points}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>

        {/* Question */}
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

        {/* Options */}
        {renderOptions(currentQuestion, answers[currentQuestion.id], handleAnswer)}

        {/* Explanation (if answered) */}
        {answers[currentQuestion.id] && currentQuestion.explanation && (
          <View style={styles.explanationBox}>
            <View style={styles.explanationHeader}>
              <Ionicons name="bulb" size={20} color="#fbbf24" />
              <Text style={styles.explanationTitle}>GIẢI THÍCH CHI TIẾT</Text>
            </View>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            onPress={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
          >
            <Ionicons name="chevron-back" size={24} color={currentQuestionIndex === 0 ? '#64748b' : '#fff'} />
          </TouchableOpacity>

          {currentQuestionIndex === session.questions.length - 1 ? (
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitQuiz}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>NỘP BÀI</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            >
              <Text style={styles.nextButtonText}>Câu tiếp theo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.navButton,
              currentQuestionIndex === session.questions.length - 1 && styles.navButtonDisabled,
            ]}
            onPress={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            disabled={currentQuestionIndex === session.questions.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={currentQuestionIndex === session.questions.length - 1 ? '#64748b' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={20} color={timeRemaining < 60 ? '#ef4444' : '#fff'} />
          <Text style={[styles.timerText, timeRemaining < 60 && styles.timerWarning]}>{formatTime(timeRemaining)}</Text>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  questionCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentQuestion: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  totalQuestions: {
    fontSize: 18,
    color: '#94a3b8',
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 24,
    lineHeight: 28,
  },
  optionsWrapper: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 8,
  },
  unsupportedText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  explanationBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
    letterSpacing: 1,
  },
  explanationText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    gap: 12,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  timerWarning: {
    color: '#ef4444',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
