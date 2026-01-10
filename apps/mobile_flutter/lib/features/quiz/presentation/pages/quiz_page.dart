import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/quiz_provider.dart';
import '../widgets/quiz_header.dart';
import '../widgets/quiz_progress_bar.dart';
import '../widgets/quiz_timer.dart';
import '../widgets/quiz_feedback.dart';
import '../widgets/quiz_actions.dart';
import '../widgets/locked_banner.dart';
import '../widgets/question_renderer.dart';
import 'quiz_result_page.dart';

class QuizPage extends ConsumerStatefulWidget {
  const QuizPage({
    required this.bookId,
    required this.chapterId,
    super.key,
  });

  final int bookId;
  final int chapterId;

  @override
  ConsumerState<QuizPage> createState() => _QuizPageState();
}

class _QuizPageState extends ConsumerState<QuizPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Load config and start quiz automatically
      ref.read(quizProvider.notifier).loadQuizConfig(
            bookId: widget.bookId,
            chapterId: widget.chapterId,
          );
      // Auto-start quiz
      Future.delayed(const Duration(milliseconds: 500), () {
        ref.read(quizProvider.notifier).startQuiz(
              bookId: widget.bookId,
              chapterId: widget.chapterId,
            );
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(quizProvider);

    // Navigate to results if quiz is completed
    if (state.result != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => QuizResultPage(
              result: state.result!,
              bookId: widget.bookId,
              chapterId: widget.chapterId,
            ),
          ),
        );
      });
    }

    return Scaffold(
      backgroundColor: const Color(0xFF1e1b4b),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1e1b4b),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () async {
            // Show confirmation dialog before closing
            final shouldExit = await showDialog<bool>(
              context: context,
              builder: (dialogContext) => AlertDialog(
                title: const Text('Thoát Quiz?'),
                content: const Text('Bạn có chắc muốn thoát? Tiến trình sẽ không được lưu.'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(dialogContext).pop(false),
                    child: const Text('Hủy'),
                  ),
                  ElevatedButton(
                    onPressed: () => Navigator.of(dialogContext).pop(true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFef4444),
                    ),
                    child: const Text('Thoát'),
                  ),
                ],
              ),
            );

            if (shouldExit == true && mounted) {
              // Reset quiz state
              ref.read(quizProvider.notifier).reset();
              if (mounted) Navigator.of(context).pop();
            }
          },
        ),
        title: const Text(
          'Quiz',
          style: TextStyle(color: Colors.white),
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF1e1b4b),
              Color(0xFF312e81),
              Color(0xFF4c1d95),
            ],
          ),
        ),
        child: _buildBody(state),
      ),
    );
  }

  Widget _buildBody(QuizState state) {
    if (state.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    if (state.error != null) {
      return _buildError(state.error!);
    }

    if (state.attempt != null) {
      return _buildQuizView(state);
    }

    return const Center(
      child: Text(
        'Đang tải quiz...',
        style: TextStyle(color: Colors.white, fontSize: 16),
      ),
    );
  }

  Widget _buildError(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                ref.read(quizProvider.notifier).startQuiz(
                      bookId: widget.bookId,
                      chapterId: widget.chapterId,
                    );
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Thử lại'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8b5cf6),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuizView(QuizState state) {
    final question = state.currentQuestion;
    if (question == null) {
      return const Center(
        child: Text(
          'Không có câu hỏi',
          style: TextStyle(color: Colors.white),
        ),
      );
    }

    final currentAnswer = state.answers[question.id];
    final isAnswered = currentAnswer != null;
    final progress = (state.currentQuestionIndex + 1) / state.totalQuestions;

    return SafeArea(
      child: Column(
        children: [
          // Header with question number and points
          Padding(
            padding: const EdgeInsets.all(20),
            child: QuizHeader(
              currentQuestion: state.currentQuestionIndex + 1,
              totalQuestions: state.totalQuestions,
              points: question.points,
            ),
          ),

          // Progress bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: QuizProgressBar(progress: progress),
          ),

          const SizedBox(height: 24),

          // Question content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Question text
                  Text(
                    question.question,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Question renderer
                  QuestionRenderer(
                    question: question,
                    selectedAnswer: currentAnswer,
                    onAnswer: (answer) {
                      ref.read(quizProvider.notifier).answerQuestion(
                            question.id,
                            answer,
                          );
                    },
                    isLocked: false,
                  ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),

          // Actions (Next/Submit)
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Timer
                if (state.timeRemaining != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: QuizTimer(timeRemaining: state.timeRemaining!),
                  ),

                // Navigation buttons
                Row(
                  children: [
                    // Previous button
                    if (state.hasPrevious)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            ref.read(quizProvider.notifier).previousQuestion();
                          },
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            side: const BorderSide(color: Colors.white),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Trước',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    if (state.hasPrevious) const SizedBox(width: 12),

                    // Next/Submit button
                    Expanded(
                      flex: state.hasPrevious ? 1 : 1,
                      child: ElevatedButton(
                        onPressed: isAnswered
                            ? () {
                                if (state.isLastQuestion) {
                                  _showSubmitConfirmation();
                                } else {
                                  ref.read(quizProvider.notifier).nextQuestion();
                                }
                              }
                            : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: state.isLastQuestion
                              ? const Color(0xFF10b981)
                              : const Color(0xFF8b5cf6),
                          disabledBackgroundColor: Colors.white.withOpacity(0.1),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          state.isLastQuestion ? 'Nộp bài' : 'Tiếp theo',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isAnswered
                                ? Colors.white
                                : Colors.white.withOpacity(0.5),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showSubmitConfirmation() {
    final state = ref.read(quizProvider);
    final unanswered = state.totalQuestions - state.answeredCount;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nộp bài Quiz?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bạn đã trả lời ${state.answeredCount}/${state.totalQuestions} câu hỏi.',
            ),
            if (unanswered > 0)
              Text(
                '\nCòn $unanswered câu chưa trả lời.',
                style: const TextStyle(
                  color: Colors.orange,
                  fontWeight: FontWeight.bold,
                ),
              ),
            const SizedBox(height: 8),
            const Text('\nBạn có chắc muốn nộp bài không?'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(quizProvider.notifier).submitQuiz();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10b981),
            ),
            child: const Text('Nộp bài'),
          ),
        ],
      ),
    );
  }
}
