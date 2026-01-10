import 'package:flutter/material.dart';

/// True/False question widget
class TrueFalseQuestion extends StatelessWidget {
  const TrueFalseQuestion({
    required this.selectedAnswer,
    required this.onAnswer,
    super.key,
  });

  final dynamic selectedAnswer;
  final Function(bool) onAnswer;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _buildOptionButton(
            context: context,
            label: 'Đúng',
            value: true,
            icon: Icons.check_circle_outline,
            color: const Color(0xFF10b981),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildOptionButton(
            context: context,
            label: 'Sai',
            value: false,
            icon: Icons.cancel_outlined,
            color: const Color(0xFFef4444),
          ),
        ),
      ],
    );
  }

  Widget _buildOptionButton({
    required BuildContext context,
    required String label,
    required bool value,
    required IconData icon,
    required Color color,
  }) {
    final isSelected = selectedAnswer == value;

    return GestureDetector(
      onTap: () => onAnswer(value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.2) : Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? color : Colors.white.withOpacity(0.2),
            width: 2,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 48,
              color: isSelected ? color : Colors.white.withOpacity(0.6),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : Colors.white.withOpacity(0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
