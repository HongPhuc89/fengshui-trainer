import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/quiz_provider.dart';
import '../widgets/difficulty_badge.dart';
import '../widgets/question_widgets.dart';
import '../widgets/quiz_app_bar.dart';
import '../widgets/quiz_navigation_buttons.dart';
import '../widgets/quiz_start_screen.dart';

class QuizPage extends ConsumerStatefulWidget {

  const QuizPage({
    required this.bookId, required this.chapterId, super.key,
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
      ref.read(quizProvider.notifier).loadQuizConfig(
            bookId: widget.bookId,
            chapterId: widget.chapterId,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(quizProvider);

    if (state.result != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.go(
          '/books/${widget.bookId}/chapters/${widget.chapterId}/quiz/results?attemptId=${state.result!.attemptId}',
        );
      });
    }

    return Scaffold(
      appBar: QuizAppBar(
        state: state,
        formatTimeRemaining: () =>
            ref.read(quizProvider.notifier).formatTimeRemaining(),
      ),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(QuizState state) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null) {
      return _buildError(state.error!);
    }

    if (state.attempt != null) {
      return _buildQuizView(state);
    }

    if (state.config != null) {
      return QuizStartScreen(
        config: state.config,
        onStart: () {
          ref.read(quizProvider.notifier).startQuiz(
                bookId: widget.bookId,
                chapterId: widget.chapterId,
              );
        },
      );
    }

    return const Center(
      child: Text('Không tìm thấy quiz cho chương này'),
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
            Text(error, textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                ref.read(quizProvider.notifier).loadQuizConfig(
                      bookId: widget.bookId,
                      chapterId: widget.chapterId,
                    );
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuizView(QuizState state) {
    final question = state.currentQuestion;
    if (question == null) {
      return const SizedBox.shrink();
    }

    final currentAnswer = state.answers[question.id];

    return Column(
      children: [
        LinearProgressIndicator(
          value: (state.currentQuestionIndex + 1) / state.totalQuestions,
          backgroundColor: Colors.grey.shade200,
          valueColor: const AlwaysStoppedAnimation<Color>(Colors.blue),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    DifficultyBadge(difficulty: question.difficulty),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.shade200),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.stars,
                              size: 16, color: Colors.amber,),
                          const SizedBox(width: 4),
                          Text(
                            '${question.points} điểm',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text(
                  question.question,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),
                _buildQuestionWidget(question, currentAnswer),
              ],
            ),
          ),
        ),
        QuizNavigationButtons(
          state: state,
          onPrevious: () => ref.read(quizProvider.notifier).previousQuestion(),
          onNext: () => ref.read(quizProvider.notifier).nextQuestion(),
          onSubmit: _showSubmitConfirmation,
        ),
      ],
    );
  }

  Widget _buildQuestionWidget(question, currentAnswer) {
    if (question.isMultipleChoice) {
      return MultipleChoiceQuestion(
        question: question,
        selectedAnswer: currentAnswer,
        onAnswerChanged: (answer) {
          ref.read(quizProvider.notifier).answerQuestion(question.id, answer);
        },
      );
    } else if (question.isMultipleAnswer) {
      return MultipleAnswerQuestion(
        question: question,
        selectedAnswers: currentAnswer,
        onAnswerChanged: (answer) {
          ref.read(quizProvider.notifier).answerQuestion(question.id, answer);
        },
      );
    } else if (question.isTrueFalse) {
      return TrueFalseQuestion(
        question: question,
        selectedAnswer: currentAnswer,
        onAnswerChanged: (answer) {
          ref.read(quizProvider.notifier).answerQuestion(question.id, answer);
        },
      );
    }

    return const Text('Loại câu hỏi không được hỗ trợ');
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
            child: const Text('Nộp bài'),
          ),
        ],
      ),
    );
  }
}
