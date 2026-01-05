import 'package:flutter/material.dart';
import '../../data/models/quiz_models.dart';

class QuizScoreCard extends StatelessWidget {
  final SubmitQuizResponse result;

  const QuizScoreCard({
    super.key,
    required this.result,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _buildPassFailIndicator(),
        const SizedBox(height: 32),
        _buildScoreDisplay(),
        const SizedBox(height: 24),
        _buildStatistics(),
      ],
    );
  }

  Widget _buildPassFailIndicator() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: result.passed ? Colors.green.shade50 : Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: result.passed ? Colors.green : Colors.red,
          width: 2,
        ),
      ),
      child: Column(
        children: [
          Icon(
            result.passed ? Icons.check_circle : Icons.cancel,
            size: 80,
            color: result.passed ? Colors.green : Colors.red,
          ),
          const SizedBox(height: 16),
          Text(
            result.passed ? 'Đạt!' : 'Chưa đạt',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: result.passed ? Colors.green : Colors.red,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScoreDisplay() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade400, Colors.blue.shade600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          const Text(
            'Điểm số',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${result.score.toStringAsFixed(1)}%',
            style: const TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${result.earnedPoints}/${result.totalPoints} điểm',
            style: const TextStyle(
              fontSize: 16,
              color: Colors.white70,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatistics() {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'Tổng số câu',
            '${result.totalQuestions}',
            Icons.help_outline,
            Colors.blue,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildStatCard(
            'Trả lời đúng',
            '${result.correctAnswers}',
            Icons.check_circle,
            Colors.green,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildStatCard(
            'Trả lời sai',
            '${result.totalQuestions - result.correctAnswers}',
            Icons.cancel,
            Colors.red,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
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
            style: const TextStyle(fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
