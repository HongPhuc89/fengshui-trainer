import 'package:flutter/material.dart';

class QuizStartScreen extends StatelessWidget {
  final dynamic config;
  final VoidCallback onStart;

  const QuizStartScreen({
    super.key,
    required this.config,
    required this.onStart,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.quiz, size: 80, color: Colors.blue),
            const SizedBox(height: 24),
            const Text(
              'Sẵn sàng làm quiz?',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 32),
            _buildInfoCard(),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onStart,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Bắt đầu Quiz'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        children: [
          _buildInfoRow(
            Icons.help_outline,
            'Số câu hỏi',
            '${config.questionCount}',
          ),
          const Divider(),
          _buildInfoRow(
            Icons.timer,
            'Thời gian',
            config.timeLimit != null
                ? '${config.timeLimit! ~/ 60} phút'
                : 'Không giới hạn',
          ),
          const Divider(),
          _buildInfoRow(
            Icons.check_circle,
            'Điểm đạt',
            '${config.passingScore}%',
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: Colors.blue),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(fontSize: 16)),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
