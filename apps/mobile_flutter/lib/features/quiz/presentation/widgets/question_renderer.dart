import 'package:flutter/material.dart';
import '../../data/models/quiz_models.dart';
import 'true_false_question.dart';
import 'multiple_choice_question.dart';
import 'multiple_answer_question.dart';
import 'matching_question.dart';
import 'ordering_question.dart';

/// Question renderer that switches between different question types
class QuestionRenderer extends StatelessWidget {
  const QuestionRenderer({
    required this.question,
    required this.selectedAnswer,
    required this.onAnswer,
    this.isLocked = false,
    super.key,
  });

  final QuizQuestion question;
  final dynamic selectedAnswer;
  final Function(dynamic) onAnswer;
  final bool isLocked;

  @override
  Widget build(BuildContext context) {
    if (isLocked) {
      // Show locked overlay
      return Stack(
        children: [
          _buildQuestionWidget(),
          Container(
            color: Colors.black.withOpacity(0.3),
            child: const Center(
              child: Icon(
                Icons.lock,
                size: 48,
                color: Colors.white54,
              ),
            ),
          ),
        ],
      );
    }

    return _buildQuestionWidget();
  }

  Widget _buildQuestionWidget() {
    final questionType = question.type.toLowerCase();
    
    switch (questionType) {
      case 'true_false':
        return TrueFalseQuestion(
          selectedAnswer: selectedAnswer,
          onAnswer: (answer) => onAnswer(answer),
        );

      case 'multiple_choice':
        final options = question.optionsList;
        return MultipleChoiceQuestion(
          options: options,
          selectedAnswer: selectedAnswer as String?,
          onAnswer: (answer) => onAnswer(answer),
        );

      case 'multiple_answer':
        final options = question.optionsList;
        final selectedAnswers = selectedAnswer is List
            ? List<String>.from(selectedAnswer as List)
            : <String>[];
        return MultipleAnswerQuestion(
          options: options,
          selectedAnswers: selectedAnswers,
          onAnswer: (answer) => onAnswer(answer),
        );

      case 'matching':
        // Parse matching options (pairs: List of {left, right})
        final optionsMap = question.options as Map<String, dynamic>? ?? {};
        final pairsJson = optionsMap['pairs'] as List? ?? [];
        final pairs = pairsJson
            .map((p) => MatchingPair.fromJson(p as Map<String, dynamic>))
            .toList();
        
        final selectedMatches = selectedAnswer is Map
            ? Map<String, String>.from(selectedAnswer as Map)
            : <String, String>{};
        
        return MatchingQuestion(
          pairs: pairs,
          selectedMatches: selectedMatches,
          onAnswer: (answer) => onAnswer(answer),
          disabled: isLocked,
        );

      case 'ordering':
        // Parse ordering options (items: List of {id, text})
        final optionsMap = question.options as Map<String, dynamic>? ?? {};
        final itemsJson = optionsMap['items'] as List? ?? [];
        final items = itemsJson
            .map((i) => OrderingItem.fromJson(i as Map<String, dynamic>))
            .toList();
            
        final selectedOrder = selectedAnswer is List
            ? List<String>.from(selectedAnswer as List)
            : <String>[];
            
        return OrderingQuestion(
          items: items,
          selectedOrder: selectedOrder,
          onAnswer: (answer) => onAnswer(answer),
          disabled: isLocked,
        );

      default:
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            'Loại câu hỏi không được hỗ trợ: ${question.type}',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withOpacity(0.7),
            ),
            textAlign: TextAlign.center,
          ),
        );
    }
  }
}
