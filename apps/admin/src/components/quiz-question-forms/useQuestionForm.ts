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
