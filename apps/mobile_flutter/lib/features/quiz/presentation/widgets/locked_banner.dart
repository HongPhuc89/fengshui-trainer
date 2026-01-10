import 'package:flutter/material.dart';

/// Locked banner shown when answer is submitted
class LockedBanner extends StatelessWidget {
  const LockedBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFf59e0b).withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: const Color(0xFFf59e0b),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.lock,
            color: Color(0xFFf59e0b),
            size: 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Đáp án đã được khóa',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withOpacity(0.9),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
