import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/quiz_provider.dart';
import '../../data/models/quiz_models.dart';

class QuizResultsPage extends ConsumerStatefulWidget {
  final int bookId;
  final int chapterId;
  final int attemptId;

  const QuizResultsPage({
    Key? key,
    required this.bookId,
    required this.chapterId,
    required this.attemptId,
  }) : super(key: key);

  @override
  ConsumerState<QuizResultsPage> createState() => _QuizResultsPageState();
}

class _QuizResultsPageState extends ConsumerState<QuizResultsPage> {
  bool _showDetails = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(quizProvider);
    final result = state.result;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kết quả Quiz'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            ref.read(quizProvider.notifier).reset();
            context.go('/books/${widget.bookId}');
          },
        ),
      ),
      body: result == null
          ? const Center(child: CircularProgressIndicator())
          : _buildResults(result, state.attempt),
    );
  }

  Widget _buildResults(SubmitQuizResponse result, QuizAttempt? attempt) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Pass/Fail indicator
          _buildPassFailIndicator(result),
          const SizedBox(height: 32),

          // Score display
          _buildScoreCard(result),
          const SizedBox(height: 24),

          // Statistics
          _buildStatistics(result),
          const SizedBox(height: 32),

          // Toggle details button
          OutlinedButton.icon(
            onPressed: () {
              setState(() {
                _showDetails = !_showDetails;
              });
            },
            icon: Icon(_showDetails ? Icons.expand_less : Icons.expand_more),
            label: Text(_showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
            ),
          ),

          // Detailed results
          if (_showDetails && attempt != null) ...[
            const SizedBox(height: 24),
            _buildDetailedResults(result, attempt),
          ],

          const SizedBox(height: 32),

          // Action buttons
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildPassFailIndicator(SubmitQuizResponse result) {
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

  Widget _buildScoreCard(SubmitQuizResponse result) {
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

  Widget _buildStatistics(SubmitQuizResponse result) {
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

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
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

  Widget _buildDetailedResults(SubmitQuizResponse result, QuizAttempt attempt) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Chi tiết từng câu',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        ...result.results.asMap().entries.map((entry) {
          final index = entry.key;
          final questionResult = entry.value;
          final question = attempt.questions.firstWhere(
            (q) => q.id == questionResult.questionId,
          );

          return _buildQuestionResult(
            index + 1,
            question,
            questionResult,
          );
        }).toList(),
      ],
    );
  }

  Widget _buildQuestionResult(
    int number,
    QuizQuestion question,
    QuizQuestionResult result,
  ) {
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
          _buildAnswerInfo('Câu trả lời của bạn', result.userAnswer, !result.isCorrect),
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
    if (answer == null) return 'Không trả lời';
    if (answer is bool) return answer ? 'Đúng' : 'Sai';
    if (answer is List) return answer.join(', ');
    return answer.toString();
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              ref.read(quizProvider.notifier).reset();
              ref.read(quizProvider.notifier).startQuiz(
                    bookId: widget.bookId,
                    chapterId: widget.chapterId,
                  );
              context.go('/books/${widget.bookId}/chapters/${widget.chapterId}/quiz');
            },
            icon: const Icon(Icons.replay),
            label: const Text('Làm lại Quiz'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              ref.read(quizProvider.notifier).reset();
              context.go('/books/${widget.bookId}');
            },
            icon: const Icon(Icons.arrow_back),
            label: const Text('Quay lại chương'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
