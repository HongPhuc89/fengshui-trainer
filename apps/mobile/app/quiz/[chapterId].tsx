import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { quizService, QuizSession, Question } from '../../services/api';
import {
  MultipleChoiceQuestion,
  MultipleAnswerQuestion,
  TrueFalseQuestion,
  MatchingQuestion,
  OrderingQuestion,
} from '../../components/quiz';

export default function ModernQuizScreen() {
  const { chapterId } = useLocalSearchParams();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Set<number>>(new Set());
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

  const handleSelectAnswer = (answer: any) => {
    if (!session) return;
    const currentQuestion = session.questions[currentQuestionIndex];

    // Don't allow editing if already submitted
    if (submittedAnswers.has(currentQuestion.id)) {
      Alert.alert('Đã xác nhận', 'Bạn đã xác nhận câu trả lời này rồi');
      return;
    }

    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
  };

  const handleConfirmAnswer = async () => {
    if (!session) return;
    const currentQuestion = session.questions[currentQuestionIndex];
    const answer = answers[currentQuestion.id];

    if (answer === undefined || answer === null) {
      Alert.alert('Chưa chọn đáp án', 'Vui lòng chọn đáp án trước khi xác nhận');
      return;
    }

    try {
      await quizService.submitAnswer(session.id, currentQuestion.id, answer);

      // Mark as submitted (lock this question)
      setSubmittedAnswers((prev) => new Set(prev).add(currentQuestion.id));

      // Auto move to next question after confirm
      if (currentQuestionIndex < session.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Lỗi', 'Không thể lưu câu trả lời. Vui lòng thử lại.');
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

  const renderQuestion = (question: Question, selectedAnswer: any, onAnswer: (answer: any) => void) => {
    const options = question.options?.options || [];

    switch (question.question_type) {
      case 'TRUE_FALSE':
        return <TrueFalseQuestion selectedAnswer={selectedAnswer} onAnswer={onAnswer} />;

      case 'MULTIPLE_CHOICE':
        return <MultipleChoiceQuestion options={options} selectedAnswer={selectedAnswer} onAnswer={onAnswer} />;

      case 'MULTIPLE_ANSWER':
        const selectedAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : [];
        return <MultipleAnswerQuestion options={options} selectedAnswers={selectedAnswers} onAnswer={onAnswer} />;

      case 'MATCHING':
        const pairs = question.options?.pairs || [];
        const selectedMatches = selectedAnswer || {};
        return <MatchingQuestion pairs={pairs} selectedMatches={selectedMatches} onAnswer={onAnswer} />;

      case 'ORDERING':
        const items = question.options?.items || [];
        const selectedOrder = Array.isArray(selectedAnswer) ? selectedAnswer : [];
        return <OrderingQuestion items={items} selectedOrder={selectedOrder} onAnswer={onAnswer} />;

      default:
        return <Text style={styles.unsupportedText}>Unsupported question type: {question.question_type}</Text>;
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

        {/* Render Question Type */}
        {renderQuestion(currentQuestion, answers[currentQuestion.id], handleSelectAnswer)}

        {/* Locked indicator */}
        {submittedAnswers.has(currentQuestion.id) && (
          <View style={styles.lockedBanner}>
            <Ionicons name="lock-closed" size={16} color="#10b981" />
            <Text style={styles.lockedText}>Đã xác nhận câu trả lời</Text>
          </View>
        )}

        {/* Confirm Answer Button or Submit Quiz */}
        {currentQuestionIndex === session.questions.length - 1 ? (
          // Last question - only show submit button
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitQuiz}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>NỘP BÀI</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          // Other questions - show confirm button (only if not submitted)
          !submittedAnswers.has(currentQuestion.id) &&
          answers[currentQuestion.id] !== undefined && (
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmAnswer} activeOpacity={0.8}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Xác nhận đáp án</Text>
            </TouchableOpacity>
          )
        )}

        {/* Explanation */}
        {answers[currentQuestion.id] && (currentQuestion as any).explanation && (
          <View style={styles.explanationBox}>
            <View style={styles.explanationHeader}>
              <Ionicons name="bulb" size={20} color="#fbbf24" />
              <Text style={styles.explanationTitle}>GIẢI THÍCH CHI TIẾT</Text>
            </View>
            <Text style={styles.explanationText}>{(currentQuestion as any).explanation}</Text>
          </View>
        )}

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
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
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
  nextButtonPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonHint: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
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
