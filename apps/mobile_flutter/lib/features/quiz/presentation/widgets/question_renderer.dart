import 'package:flutter/material.dart';
import '../../data/models/quiz_models.dart';
import 'true_false_question.dart';
import 'multiple_choice_question.dart';
import 'multiple_answer_question.dart';
import 'matching_question.dart';

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
        // Parse matching options
        final optionsMap = question.options as Map<String, dynamic>? ?? {};
        final leftItems = (optionsMap['left'] as List?)?.cast<String>() ?? [];
        final rightItems = (optionsMap['right'] as List?)?.cast<String>() ?? [];
        final selectedMatches = selectedAnswer is Map
            ? Map<String, String>.from(selectedAnswer as Map)
            : <String, String>{};
        
        return MatchingQuestion(
          leftItems: leftItems,
          rightItems: rightItems,
          selectedMatches: selectedMatches,
          onAnswer: (answer) => onAnswer(answer),
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
