import 'package:flutter/material.dart';

/// Quiz timer showing countdown
class QuizTimer extends StatelessWidget {
  const QuizTimer({
    required this.timeRemaining,
    super.key,
  });

  final int timeRemaining; // in seconds

  @override
  Widget build(BuildContext context) {
    final minutes = timeRemaining ~/ 60;
    final seconds = timeRemaining % 60;
    final isWarning = timeRemaining < 60;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isWarning
            ? const Color(0xFFef4444).withOpacity(0.2)
            : Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isWarning
              ? const Color(0xFFef4444)
              : Colors.white.withOpacity(0.2),
          width: 2,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.timer_outlined,
            color: isWarning ? const Color(0xFFef4444) : Colors.white,
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(
            '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isWarning ? const Color(0xFFef4444) : Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
