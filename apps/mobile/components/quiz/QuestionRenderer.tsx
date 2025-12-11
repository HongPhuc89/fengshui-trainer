import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Question } from '../../services/api/quiz.service';
import {
  MultipleChoiceQuestion,
  MultipleAnswerQuestion,
  TrueFalseQuestion,
  MatchingQuestion,
  OrderingQuestion,
} from './index';

interface QuestionRendererProps {
  question: Question;
  selectedAnswer: any;
  onAnswer: (answer: any) => void;
  isLocked?: boolean;
}

export function QuestionRenderer({ question, selectedAnswer, onAnswer, isLocked = false }: QuestionRendererProps) {
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
      return (
        <MatchingQuestion pairs={pairs} selectedMatches={selectedMatches} onAnswer={onAnswer} disabled={isLocked} />
      );

    case 'ORDERING':
      const items = question.options?.items || [];
      const selectedOrder = Array.isArray(selectedAnswer) ? selectedAnswer : [];
      return <OrderingQuestion items={items} selectedOrder={selectedOrder} onAnswer={onAnswer} disabled={isLocked} />;

    default:
      return <Text style={styles.unsupportedText}>Unsupported question type: {question.question_type}</Text>;
  }
}

const styles = StyleSheet.create({
  unsupportedText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});
