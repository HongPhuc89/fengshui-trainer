import 'package:flutter/material.dart';
import '../../data/models/quiz_models.dart';

/// Multiple choice question widget (single selection)
class MultipleChoiceQuestion extends StatelessWidget {
  const MultipleChoiceQuestion({
    required this.options,
    required this.selectedAnswer,
    required this.onAnswer,
    super.key,
  });

  final List<QuizOption> options;
  final String? selectedAnswer;
  final Function(String) onAnswer;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: options.asMap().entries.map((entry) {
        final index = entry.key;
        final option = entry.value;
        final isSelected = selectedAnswer == option.id;
        final optionLabel = String.fromCharCode(65 + index); // A, B, C, D...

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GestureDetector(
            onTap: () => onAnswer(option.id),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFF8b5cf6).withOpacity(0.2)
                    : Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isSelected
                      ? const Color(0xFF8b5cf6)
                      : Colors.white.withOpacity(0.2),
                  width: 2,
                ),
              ),
              child: Row(
                children: [
                  // Option label (A, B, C, D)
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFF8b5cf6)
                          : Colors.white.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        optionLabel,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? Colors.white
                              : Colors.white.withOpacity(0.6),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Option text
                  Expanded(
                    child: Text(
                      option.text,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: isSelected
                            ? Colors.white
                            : Colors.white.withOpacity(0.9),
                      ),
                    ),
                  ),
                  // Selected indicator
                  if (isSelected)
                    const Icon(
                      Icons.check_circle,
                      color: Color(0xFF8b5cf6),
                      size: 24,
                    ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
