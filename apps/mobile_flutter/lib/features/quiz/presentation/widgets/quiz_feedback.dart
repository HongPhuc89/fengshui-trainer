import 'package:flutter/material.dart';

/// Quiz feedback showing correct/incorrect result
class QuizFeedback extends StatelessWidget {
  const QuizFeedback({
    required this.isCorrect,
    super.key,
  });

  final bool isCorrect;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isCorrect
            ? const Color(0xFF10b981).withOpacity(0.2)
            : const Color(0xFFef4444).withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCorrect ? const Color(0xFF10b981) : const Color(0xFFef4444),
          width: 2,
        ),
      ),
      child: Row(
        children: [
          Icon(
            isCorrect ? Icons.check_circle : Icons.cancel,
            color: isCorrect ? const Color(0xFF10b981) : const Color(0xFFef4444),
            size: 32,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              isCorrect ? 'Chính xác! 🎉' : 'Chưa đúng, cố gắng lần sau! 💪',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isCorrect ? const Color(0xFF10b981) : const Color(0xFFef4444),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
