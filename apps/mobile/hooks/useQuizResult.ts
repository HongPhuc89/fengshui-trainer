import { useState, useEffect } from 'react';
import { quizService, QuizResult } from '../services/api/quiz.service';

export function useQuizResult(sessionId: string | string[]) {
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchResult();
  }, []);

  return {
    result,
    loading,
  };
}
