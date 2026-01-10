import 'package:flutter/material.dart';

/// Quiz result header showing pass/fail status
class QuizResultHeader extends StatelessWidget {
  const QuizResultHeader({
    required this.passed,
    super.key,
  });

  final bool passed;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: passed
              ? [const Color(0xFF10b981), const Color(0xFF059669)]
              : [const Color(0xFFef4444), const Color(0xFFdc2626)],
        ),
      ),
      child: Column(
        children: [
          Icon(
            passed ? Icons.celebration : Icons.sentiment_dissatisfied,
            size: 80,
            color: Colors.white,
          ),
          const SizedBox(height: 16),
          Text(
            passed ? 'Xuất sắc!' : 'Chưa đạt',
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            passed
                ? 'Bạn đã vượt qua bài kiểm tra!'
                : 'Đừng nản lòng, hãy thử lại!',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white.withOpacity(0.9),
            ),
          ),
        ],
      ),
    );
  }
}
