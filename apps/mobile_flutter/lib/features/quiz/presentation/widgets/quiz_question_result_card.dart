import 'package:flutter/material.dart';
import '../../data/models/quiz_models.dart';

class QuizQuestionResultCard extends StatelessWidget {

  const QuizQuestionResultCard({
    required this.number, required this.question, required this.result, super.key,
  });
  final int number;
  final QuizQuestion question;
  final QuizQuestionResult result;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: result.isCorrect ? Colors.green.shade50 : Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: result.isCorrect ? Colors.green.shade200 : Colors.red.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: result.isCorrect ? Colors.green : Colors.red,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    '$number',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  question.question,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Icon(
                result.isCorrect ? Icons.check_circle : Icons.cancel,
                color: result.isCorrect ? Colors.green : Colors.red,
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildAnswerInfo(
            'Câu trả lời của bạn',
            result.userAnswer,
            !result.isCorrect,
          ),
          if (!result.isCorrect && result.correctAnswer != null) ...[
            const SizedBox(height: 8),
            _buildAnswerInfo('Đáp án đúng', result.correctAnswer, false),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.stars, size: 16, color: Colors.amber),
              const SizedBox(width: 4),
              Text(
                '${result.pointsEarned}/${question.points} điểm',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAnswerInfo(String label, dynamic answer, bool isWrong) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$label: ',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey.shade700,
          ),
        ),
        Expanded(
          child: Text(
            _formatAnswer(answer),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isWrong ? Colors.red : Colors.green.shade700,
            ),
          ),
        ),
      ],
    );
  }

  String _formatAnswer(dynamic answer) {
    if (answer == null) {
      return 'Không trả lời';
    }
    if (answer is bool) {
      return answer ? 'Đúng' : 'Sai';
    }
    if (answer is List) {
      return answer.join(', ');
    }
    return answer.toString();
  }
}
