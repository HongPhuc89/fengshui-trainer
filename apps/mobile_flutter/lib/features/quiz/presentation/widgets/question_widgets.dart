import 'package:flutter/material.dart';
import '../../data/models/quiz_models.dart';

/// Multiple Choice Question Widget (Radio buttons)
class MultipleChoiceQuestion extends StatelessWidget {
  final QuizQuestion question;
  final dynamic selectedAnswer;
  final ValueChanged<dynamic> onAnswerChanged;

  const MultipleChoiceQuestion({
    Key? key,
    required this.question,
    required this.selectedAnswer,
    required this.onAnswerChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final options = question.optionsList;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: options.map((option) {
        return RadioListTile<String>(
          title: Text(option),
          value: option,
          groupValue: selectedAnswer as String?,
          onChanged: (value) {
            if (value != null) {
              onAnswerChanged(value);
            }
          },
          activeColor: Colors.blue,
        );
      }).toList(),
    );
  }
}

/// Multiple Answer Question Widget (Checkboxes)
class MultipleAnswerQuestion extends StatelessWidget {
  final QuizQuestion question;
  final dynamic selectedAnswers;
  final ValueChanged<dynamic> onAnswerChanged;

  const MultipleAnswerQuestion({
    Key? key,
    required this.question,
    required this.selectedAnswers,
    required this.onAnswerChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final options = question.optionsList;
    final selected = selectedAnswers is List
        ? List<String>.from(selectedAnswers)
        : <String>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: options.map((option) {
        final isSelected = selected.contains(option);

        return CheckboxListTile(
          title: Text(option),
          value: isSelected,
          onChanged: (bool? value) {
            final newSelected = List<String>.from(selected);
            if (value == true) {
              newSelected.add(option);
            } else {
              newSelected.remove(option);
            }
            onAnswerChanged(newSelected);
          },
          activeColor: Colors.blue,
        );
      }).toList(),
    );
  }
}

/// True/False Question Widget (Two large buttons)
class TrueFalseQuestion extends StatelessWidget {
  final QuizQuestion question;
  final dynamic selectedAnswer;
  final ValueChanged<dynamic> onAnswerChanged;

  const TrueFalseQuestion({
    Key? key,
    required this.question,
    required this.selectedAnswer,
    required this.onAnswerChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 24),
        _buildButton(
          context: context,
          label: 'Đúng',
          value: true,
          icon: Icons.check_circle,
          color: Colors.green,
        ),
        const SizedBox(height: 16),
        _buildButton(
          context: context,
          label: 'Sai',
          value: false,
          icon: Icons.cancel,
          color: Colors.red,
        ),
      ],
    );
  }

  Widget _buildButton({
    required BuildContext context,
    required String label,
    required bool value,
    required IconData icon,
    required Color color,
  }) {
    final isSelected = selectedAnswer == value;

    return SizedBox(
      width: double.infinity,
      height: 80,
      child: ElevatedButton.icon(
        onPressed: () => onAnswerChanged(value),
        icon: Icon(icon, size: 32),
        label: Text(
          label,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: isSelected ? color : Colors.grey.shade200,
          foregroundColor: isSelected ? Colors.white : Colors.black87,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: isSelected ? color : Colors.grey.shade300,
              width: 2,
            ),
          ),
        ),
      ),
    );
  }
}
