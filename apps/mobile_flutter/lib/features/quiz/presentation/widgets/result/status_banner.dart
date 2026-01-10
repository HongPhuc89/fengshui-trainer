import 'package:flutter/material.dart';

/// Status banner showing pass/fail message
class StatusBanner extends StatelessWidget {
  const StatusBanner({
    required this.passed,
    required this.passingScorePercentage,
    super.key,
  });

  final bool passed;
  final int passingScorePercentage;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: passed
            ? const Color(0xFF10b981).withOpacity(0.1)
            : const Color(0xFFef4444).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: passed ? const Color(0xFF10b981) : const Color(0xFFef4444),
          width: 2,
        ),
      ),
      child: Row(
        children: [
          Icon(
            passed ? Icons.check_circle : Icons.info,
            color: passed ? const Color(0xFF10b981) : const Color(0xFFef4444),
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              passed
                  ? 'Bạn đã đạt điểm chuẩn ($passingScorePercentage%)'
                  : 'Cần đạt tối thiểu $passingScorePercentage% để đạt',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: passed ? const Color(0xFF10b981) : const Color(0xFFef4444),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
