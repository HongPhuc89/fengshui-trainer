import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSizes, spacing } from '@/constants';
import { quizService } from '@/modules/shared/services/api';
import { QuizAttempt, QuizQuestion, SubmitQuizResponse } from '@/modules/shared/services/api/types';

const { width } = Dimensions.get('window');

type QuestionType = 'multiple_choice' | 'multiple_answer' | 'true_false';

export default function QuizScreen() {
  const { chapterId, bookId } = useLocalSearchParams<{ chapterId: string; bookId: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitQuizResponse | null>(null);

  useEffect(() => {
    startQuiz();
  }, [chapterId]);

  const startQuiz = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const chapterIdNum = parseInt(chapterId as string);
      const bookIdNum = parseInt(bookId as string);
      const attemptData = await quizService.startQuiz(bookIdNum, chapterIdNum);
      setAttempt(attemptData);
    } catch (err: any) {
      setError(err.message || 'Không thể bắt đầu quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (questionId: number, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    if (!attempt) return;

    // Check if all questions are answered
    const unansweredCount = attempt.questions.filter((q) => !answers[q.id]).length;
    if (unansweredCount > 0) {
      Alert.alert('Chưa hoàn thành', `Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có muốn nộp bài không?`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Nộp bài', onPress: submitQuiz },
      ]);
      return;
    }

    submitQuiz();
  };

  const submitQuiz = async () => {
    if (!attempt) return;

    try {
      setIsSubmitting(true);
      const chapterIdNum = parseInt(chapterId as string);
      const bookIdNum = parseInt(bookId as string);
      const resultData = await quizService.submitQuiz(bookIdNum, chapterIdNum, {
        attempt_id: attempt.id,
        answers,
      });
      setResult(resultData);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể nộp bài');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (attempt && currentQuestionIndex < attempt.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Đang chuẩn bị quiz...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error || !attempt) {
    return (
      <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Thử Thách</Text>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="flash-outline" size={64} color="#F59E0B" />
            <Text style={styles.errorText}>{error || 'Không thể tải quiz'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={startQuiz}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Show result screen
  if (result) {
    return (
      <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Kết Quả</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Result Card */}
            <View style={styles.resultCard}>
              <LinearGradient
                colors={
                  result.passed
                    ? (['#10B981', '#059669'] as [string, string, ...string[]])
                    : (['#EF4444', '#DC2626'] as [string, string, ...string[]])
                }
                style={styles.resultCardGradient}
              >
                <Ionicons name={result.passed ? 'checkmark-circle' : 'close-circle'} size={80} color="#fff" />
                <Text style={styles.resultTitle}>{result.passed ? 'Chúc mừng! 🎉' : 'Cố gắng lần sau! 💪'}</Text>
                <Text style={styles.resultScore}>{result.score}%</Text>
                <Text style={styles.resultSubtitle}>
                  {result.correctAnswers}/{result.totalQuestions} câu đúng
                </Text>
                <View style={styles.resultStats}>
                  <View style={styles.resultStat}>
                    <Text style={styles.resultStatLabel}>Điểm đạt được</Text>
                    <Text style={styles.resultStatValue}>
                      {result.earnedPoints}/{result.totalPoints}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Detailed Results */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Chi tiết kết quả</Text>
              {result.results.map((questionResult, index) => {
                const question = attempt.questions.find((q) => q.id === questionResult.questionId);
                if (!question) return null;

                return (
                  <View key={questionResult.questionId} style={styles.questionResultCard}>
                    <View style={styles.questionResultHeader}>
                      <View style={styles.questionResultNumber}>
                        <Text style={styles.questionResultNumberText}>{index + 1}</Text>
                      </View>
                      <Ionicons
                        name={questionResult.isCorrect ? 'checkmark-circle' : 'close-circle'}
                        size={24}
                        color={questionResult.isCorrect ? '#10B981' : '#EF4444'}
                      />
                    </View>
                    <Text style={styles.questionResultText}>{question.question}</Text>
                    <View style={styles.questionResultFooter}>
                      <Text
                        style={[
                          styles.questionResultStatus,
                          questionResult.isCorrect
                            ? styles.questionResultStatusCorrect
                            : styles.questionResultStatusWrong,
                        ]}
                      >
                        {questionResult.isCorrect ? '✓ Đúng' : '✗ Sai'}
                      </Text>
                      <Text style={styles.questionResultPoints}>+{questionResult.pointsEarned} điểm</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.resultActionButton} onPress={startQuiz}>
                <LinearGradient
                  colors={['#F59E0B', '#D97706'] as [string, string, ...string[]]}
                  style={styles.resultActionButtonGradient}
                >
                  <Ionicons name="refresh" size={24} color="#fff" />
                  <Text style={styles.resultActionButtonText}>Làm lại</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resultActionButton} onPress={() => router.back()}>
                <View style={styles.resultActionButtonOutline}>
                  <Ionicons name="home" size={24} color="#F59E0B" />
                  <Text style={styles.resultActionButtonOutlineText}>Về trang chủ</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const currentQuestion = attempt.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / attempt.questions.length) * 100;
  const currentAnswer = answers[currentQuestion.id];

  return (
    <LinearGradient colors={['#1a1f3a', '#2d1f3a', '#3a1f2d']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thử Thách</Text>
          <View style={styles.headerRight}>
            <Text style={styles.progressText}>
              {currentQuestionIndex + 1}/{attempt.questions.length}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Question */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyText}>
                  {currentQuestion.difficulty === 'easy'
                    ? '🟢 Dễ'
                    : currentQuestion.difficulty === 'medium'
                      ? '🟡 Trung bình'
                      : '🔴 Khó'}
                </Text>
              </View>
              <Text style={styles.pointsText}>{currentQuestion.points} điểm</Text>
            </View>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>{renderOptions(currentQuestion, currentAnswer, handleAnswer)}</View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            onPress={previousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <Ionicons name="chevron-back" size={24} color={currentQuestionIndex === 0 ? '#6B7280' : '#fff'} />
            <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}>
              Trước
            </Text>
          </TouchableOpacity>

          {currentQuestionIndex === attempt.questions.length - 1 ? (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
              <LinearGradient
                colors={['#10B981', '#059669'] as [string, string, ...string[]]}
                style={styles.submitButtonGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={24} color="#fff" />
                    <Text style={styles.submitButtonText}>Nộp bài</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.navButton} onPress={nextQuestion}>
              <Text style={styles.navButtonText}>Tiếp</Text>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function renderOptions(
  question: QuizQuestion,
  currentAnswer: any,
  handleAnswer: (questionId: number, answer: any) => void,
) {
  const options = question.options;

  if (question.type === 'true_false') {
    return (
      <>
        <TouchableOpacity
          style={[styles.option, currentAnswer === true && styles.optionSelected]}
          onPress={() => handleAnswer(question.id, true)}
        >
          <View style={styles.optionRadio}>
            {currentAnswer === true && <View style={styles.optionRadioSelected} />}
          </View>
          <Text style={styles.optionText}>Đúng</Text>
          {currentAnswer === true && <Ionicons name="checkmark" size={20} color="#10B981" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, currentAnswer === false && styles.optionSelected]}
          onPress={() => handleAnswer(question.id, false)}
        >
          <View style={styles.optionRadio}>
            {currentAnswer === false && <View style={styles.optionRadioSelected} />}
          </View>
          <Text style={styles.optionText}>Sai</Text>
          {currentAnswer === false && <Ionicons name="checkmark" size={20} color="#10B981" />}
        </TouchableOpacity>
      </>
    );
  }

  if (question.type === 'multiple_choice') {
    return options.map((option: any, index: number) => {
      const isSelected = currentAnswer === option.value || currentAnswer === index;
      return (
        <TouchableOpacity
          key={index}
          style={[styles.option, isSelected && styles.optionSelected]}
          onPress={() => handleAnswer(question.id, option.value || index)}
        >
          <View style={styles.optionRadio}>{isSelected && <View style={styles.optionRadioSelected} />}</View>
          <Text style={styles.optionText}>{option.text || option}</Text>
          {isSelected && <Ionicons name="checkmark" size={20} color="#10B981" />}
        </TouchableOpacity>
      );
    });
  }

  if (question.type === 'multiple_answer') {
    const selectedAnswers = currentAnswer || [];
    return options.map((option: any, index: number) => {
      const value = option.value || index;
      const isSelected = selectedAnswers.includes(value);
      return (
        <TouchableOpacity
          key={index}
          style={[styles.option, isSelected && styles.optionSelected]}
          onPress={() => {
            const newAnswers = isSelected
              ? selectedAnswers.filter((a: any) => a !== value)
              : [...selectedAnswers, value];
            handleAnswer(question.id, newAnswers);
          }}
        >
          <View style={styles.optionCheckbox}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.optionText}>{option.text || option}</Text>
        </TouchableOpacity>
      );
    });
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: spacing.sm,
  },
  headerRight: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  progressText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Progress Bar
  progressBarContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: '#fff',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: fontSizes.base,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },

  // Question Card
  questionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: fontSizes.xs,
    color: '#fff',
    fontWeight: '600',
  },
  pointsText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: '#F59E0B',
  },
  questionText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 28,
  },

  // Options
  optionsContainer: {
    paddingHorizontal: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B7280',
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  optionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6B7280',
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  optionText: {
    flex: 1,
    fontSize: fontSizes.base,
    color: '#fff',
    lineHeight: 22,
  },

  // Navigation
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: spacing.xs,
  },
  navButtonTextDisabled: {
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    marginLeft: spacing.md,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#fff',
    marginLeft: spacing.sm,
  },

  // Result
  resultCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: 24,
    overflow: 'hidden',
  },
  resultCardGradient: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: spacing.md,
  },
  resultScore: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: spacing.sm,
  },
  resultSubtitle: {
    fontSize: fontSizes.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: spacing.xs,
  },
  resultStats: {
    marginTop: spacing.lg,
    width: '100%',
  },
  resultStat: {
    alignItems: 'center',
  },
  resultStatLabel: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  resultStatValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: spacing.xs,
  },

  // Details
  detailsSection: {
    paddingHorizontal: spacing.lg,
  },
  detailsTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: spacing.md,
  },
  questionResultCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  questionResultNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionResultNumberText: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: '#fff',
  },
  questionResultText: {
    fontSize: fontSizes.base,
    color: '#D1D5DB',
    marginBottom: spacing.sm,
  },
  questionResultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionResultStatus: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  questionResultStatusCorrect: {
    color: '#10B981',
  },
  questionResultStatusWrong: {
    color: '#EF4444',
  },
  questionResultPoints: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Result Actions
  resultActions: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  resultActionButton: {
    marginBottom: spacing.md,
  },
  resultActionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  resultActionButtonText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#fff',
    marginLeft: spacing.sm,
  },
  resultActionButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  resultActionButtonOutlineText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: '#F59E0B',
    marginLeft: spacing.sm,
  },

  // Bottom Spacing
  bottomSpacer: {
    height: 40,
  },
});
