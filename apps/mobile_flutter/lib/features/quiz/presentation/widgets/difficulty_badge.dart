import 'package:flutter/material.dart';

class DifficultyBadge extends StatelessWidget {

  const DifficultyBadge({
    required this.difficulty, super.key,
  });
  final String difficulty;

  @override
  Widget build(BuildContext context) {
    final (color, label) = _getDifficultyInfo();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  (Color, String) _getDifficultyInfo() {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return (Colors.green, 'Dễ');
      case 'hard':
        return (Colors.red, 'Khó');
      default:
        return (Colors.orange, 'Trung bình');
    }
  }
}
