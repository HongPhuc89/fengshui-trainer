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
            label: 'ĐÚNG',
            value: true,
            icon: Icons.check_circle_outline,
            selectedIcon: Icons.check_circle,
            color: const Color(0xFF10b981), // Green
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildOptionButton(
            context: context,
            label: 'SAI',
            value: false,
            icon: Icons.cancel_outlined,
            selectedIcon: Icons.cancel,
            color: const Color(0xFFef4444), // Red
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
    required IconData selectedIcon,
    required Color color,
  }) {
    final isSelected = selectedAnswer == value;

    return GestureDetector(
      onTap: () => onAnswer(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : Colors.white.withOpacity(0.02),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color : color.withOpacity(0.3),
            width: 2.5,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.2),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [],
        ),
        child: Column(
          children: [
            Icon(
              isSelected ? selectedIcon : icon,
              size: 56,
              color: isSelected ? color : color.withOpacity(0.5),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: isSelected ? Colors.white : Colors.white.withOpacity(0.5),
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
