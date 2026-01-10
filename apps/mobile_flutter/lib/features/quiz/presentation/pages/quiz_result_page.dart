import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/quiz_models.dart';
import '../widgets/result/quiz_result_header.dart';
import '../widgets/result/score_card.dart';
import '../widgets/result/status_banner.dart';
import '../widgets/result/stats_container.dart';
import '../widgets/result/result_actions.dart';

class QuizResultPage extends ConsumerWidget {
  const QuizResultPage({
    required this.result,
    required this.bookId,
    required this.chapterId,
    super.key,
  });

  final SubmitQuizResponse result;
  final int bookId;
  final int chapterId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: const Color(0xFFf9fafb),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black87),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Kết quả Quiz',
          style: TextStyle(color: Colors.black87),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Header with pass/fail status
            QuizResultHeader(passed: result.passed),

            const SizedBox(height: 24),

            // Score card with circular progress
            ScoreCard(
              score: result.earnedPoints,
              totalPoints: result.totalPoints,
              percentage: result.score,
            ),

            const SizedBox(height: 16),

            // Status banner
            StatusBanner(
              passed: result.passed,
              passingScorePercentage: 70, // Default passing score
            ),

            const SizedBox(height: 16),

            // Stats container
            StatsContainer(
              correctCount: result.correctAnswers,
              incorrectCount: result.totalQuestions - result.correctAnswers,
              totalQuestions: result.totalQuestions,
            ),

            const SizedBox(height: 24),

            // Action buttons
            ResultActions(
              onBack: () => Navigator.of(context).pop(),
              onRetry: () {
                Navigator.of(context).pop();
                // Navigate back to quiz page to retry
                Navigator.of(context).pushNamed(
                  '/quiz',
                  arguments: {
                    'bookId': bookId,
                    'chapterId': chapterId,
                  },
                );
              },
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
