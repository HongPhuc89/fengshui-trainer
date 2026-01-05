import 'package:flutter/material.dart';

class FlashcardSwipeBackground extends StatelessWidget {
  final Alignment alignment;
  final Color color;
  final IconData icon;
  final String label;

  const FlashcardSwipeBackground({
    super.key,
    required this.alignment,
    required this.color,
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: alignment,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: color),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
