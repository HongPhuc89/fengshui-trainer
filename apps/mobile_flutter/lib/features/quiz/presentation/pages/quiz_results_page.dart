import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/quiz_provider.dart';
import '../../data/models/quiz_models.dart';
import '../widgets/quiz_score_card.dart';
import '../widgets/quiz_question_result_card.dart';

class QuizResultsPage extends ConsumerStatefulWidget {
  final int bookId;
  final int chapterId;
  final int attemptId;

  const QuizResultsPage({
    super.key,
    required this.bookId,
    required this.chapterId,
    required this.attemptId,
  });

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
          QuizScoreCard(result: result),
          const SizedBox(height: 32),
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
          if (_showDetails && attempt != null) ...[
            const SizedBox(height: 24),
            _buildDetailedResults(result, attempt),
          ],
          const SizedBox(height: 32),
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildDetailedResults(
    SubmitQuizResponse result,
    QuizAttempt attempt,
  ) {
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

          return QuizQuestionResultCard(
            number: index + 1,
            question: question,
            result: questionResult,
          );
        }),
      ],
    );
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
              context.go(
                '/books/${widget.bookId}/chapters/${widget.chapterId}/quiz',
              );
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
