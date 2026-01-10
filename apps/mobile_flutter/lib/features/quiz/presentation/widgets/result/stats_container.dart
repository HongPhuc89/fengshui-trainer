import 'package:flutter/material.dart';

/// Stats container showing correct/incorrect/total questions
class StatsContainer extends StatelessWidget {
  const StatsContainer({
    required this.correctCount,
    required this.incorrectCount,
    required this.totalQuestions,
    super.key,
  });

  final int correctCount;
  final int incorrectCount;
  final int totalQuestions;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStat(
            icon: Icons.check_circle,
            label: 'Đúng',
            value: correctCount.toString(),
            color: const Color(0xFF10b981),
          ),
          _buildDivider(),
          _buildStat(
            icon: Icons.cancel,
            label: 'Sai',
            value: incorrectCount.toString(),
            color: const Color(0xFFef4444),
          ),
          _buildDivider(),
          _buildStat(
            icon: Icons.quiz,
            label: 'Tổng',
            value: totalQuestions.toString(),
            color: const Color(0xFF6366f1),
          ),
        ],
      ),
    );
  }

  Widget _buildStat({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, color: color, size: 32),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 60,
      color: Colors.grey[300],
    );
  }
}
