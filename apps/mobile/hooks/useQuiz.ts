import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { quizService, QuizSession, Question } from '../services/api';

export function useQuiz(chapterId: string | string[]) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Set<number>>(new Set());
  const [answerFeedback, setAnswerFeedback] = useState<{ questionId: number; isCorrect: boolean } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Start quiz
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

  // Select answer
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

  // Confirm answer
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

      // Check if answer is correct
      const isCorrect = checkAnswer(currentQuestion, answer);

      // Show feedback
      setAnswerFeedback({ questionId: currentQuestion.id, isCorrect });

      // Mark as submitted (lock this question)
      setSubmittedAnswers((prev) => new Set(prev).add(currentQuestion.id));

      // Auto move to next question after showing feedback
      setTimeout(() => {
        setAnswerFeedback(null);
        if (currentQuestionIndex < session.questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
      }, 1500); // Show feedback for 1.5 seconds
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Lỗi', 'Không thể lưu câu trả lời. Vui lòng thử lại.');
    }
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    if (!session) {
      console.log('❌ No session');
      return;
    }

    console.log('🎯 Submitting quiz...');

    try {
      setSubmitting(true);

      const result = await quizService.completeQuiz(session.id);
      console.log('✅ Quiz completed:', result);

      // Navigate to result page
      router.replace({
        pathname: '/quiz-result/[sessionId]',
        params: { sessionId: session.id.toString() },
      });
    } catch (error: any) {
      console.error('❌ Error:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to check if answer is correct
  const checkAnswer = (question: any, userAnswer: any): boolean => {
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
      case 'MATCHING':
        const correctPairs = question.options.pairs || [];
        const userPairs = userAnswer || {};
        return correctPairs.every((pair: any) => userPairs[pair.left] === pair.right);
      case 'ORDERING':
        const correctOrder = (question.options.items || []).map((item: any) => item.id);
        const userOrder = Array.isArray(userAnswer) ? userAnswer : [];
        return JSON.stringify(correctOrder) === JSON.stringify(userOrder);
      default:
        return false;
    }
  };

  // Timer effect
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

  // Clear feedback when changing questions
  useEffect(() => {
    setAnswerFeedback(null);
  }, [currentQuestionIndex]);

  // Start quiz on mount
  useEffect(() => {
    startQuiz();
  }, []);

  return {
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
  };
}
