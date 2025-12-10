import { useState } from 'react';

export const initialFormData = {
  question_type: 'MULTIPLE_CHOICE',
  difficulty: 'EASY',
  question_text: '',
  points: 2,
  explanation: '',
  options: [
    { id: 'a', text: '' },
    { id: 'b', text: '' },
    { id: 'c', text: '' },
    { id: 'd', text: '' },
  ],
  correctAnswer: 'a',
  correctAnswers: [] as string[],
  trueFalseAnswer: true,
  matchingPairs: [
    { id: 1, left: '', right: '' },
    { id: 2, left: '', right: '' },
  ],
  orderingItems: [
    { id: 'a', text: '', correct_order: 1 },
    { id: 'b', text: '', correct_order: 2 },
  ],
};

export const useQuestionForm = () => {
  const [formData, setFormData] = useState(initialFormData);

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const loadQuestion = (question: any) => {
    const options = question.options || {};

    setFormData({
      question_type: question.question_type,
      difficulty: question.difficulty,
      question_text: question.question_text,
      points: question.points,
      explanation: question.explanation || '',
      options: options.options || initialFormData.options,
      correctAnswer: options.correct_answer || 'a',
      correctAnswers: options.correct_answers || [],
      trueFalseAnswer: options.correct_answer ?? true,
      matchingPairs: options.pairs || initialFormData.matchingPairs,
      orderingItems: options.items || initialFormData.orderingItems,
    });
  };

  const buildOptionsJson = () => {
    switch (formData.question_type) {
      case 'TRUE_FALSE':
        return {
          correct_answer: formData.trueFalseAnswer,
          true_label: 'True',
          false_label: 'False',
        };
      case 'MULTIPLE_CHOICE':
        return {
          options: formData.options.filter((opt) => opt.text.trim()),
          correct_answer: formData.correctAnswer,
        };
      case 'MULTIPLE_ANSWER':
        return {
          options: formData.options.filter((opt) => opt.text.trim()),
          correct_answers: formData.correctAnswers,
        };
      case 'MATCHING':
        return {
          pairs: formData.matchingPairs.filter((pair) => pair.left.trim() && pair.right.trim()),
        };
      case 'ORDERING':
        return {
          items: formData.orderingItems.filter((item) => item.text.trim()),
        };
      default:
        return {};
    }
  };

  return {
    formData,
    setFormData,
    resetForm,
    loadQuestion,
    buildOptionsJson,
  };
};
