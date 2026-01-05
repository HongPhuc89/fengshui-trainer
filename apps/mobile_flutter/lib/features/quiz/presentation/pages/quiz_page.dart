import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/quiz_provider.dart';
import '../widgets/question_widgets.dart';

class QuizPage extends ConsumerStatefulWidget {
  final int bookId;
  final int chapterId;

  const QuizPage({
    Key? key,
    required this.bookId,
    required this.chapterId,
  }) : super(key: key);

  @override
  ConsumerState<QuizPage> createState() => _QuizPageState();
}

class _QuizPageState extends ConsumerState<QuizPage> {
  @override
  void initState() {
    super.initState();
    // Load quiz config when page opens
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

    // If quiz is submitted, navigate to results
    if (state.result != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.go(
          '/books/${widget.bookId}/chapters/${widget.chapterId}/quiz/results?attemptId=${state.result!.attemptId}',
        );
      });
    }

    return Scaffold(
      appBar: _buildAppBar(state),
      body: _buildBody(state),
    );
  }

  PreferredSizeWidget _buildAppBar(QuizState state) {
    if (state.attempt != null) {
      // Quiz in progress
      return AppBar(
        title: Text('Câu ${state.currentQuestionIndex + 1}/${state.totalQuestions}'),
        actions: [
          if (state.timeRemaining != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Row(
                  children: [
                    Icon(
                      Icons.timer,
                      color: state.isTimeUp ? Colors.red : Colors.white,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      ref.read(quizProvider.notifier).formatTimeRemaining(),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: state.isTimeUp ? Colors.red : Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      );
    }

    return AppBar(
      title: const Text('Quiz'),
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
      return _buildQuizStart(state.config!);
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

  Widget _buildQuizStart(dynamic config) {
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
            _buildInfoCard(config),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  ref.read(quizProvider.notifier).startQuiz(
                        bookId: widget.bookId,
                        chapterId: widget.chapterId,
                      );
                },
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

  Widget _buildInfoCard(dynamic config) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        children: [
          _buildInfoRow(Icons.help_outline, 'Số câu hỏi', '${config.questionCount}'),
          const Divider(),
          _buildInfoRow(Icons.timer, 'Thời gian', 
              config.timeLimit != null ? '${config.timeLimit! ~/ 60} phút' : 'Không giới hạn'),
          const Divider(),
          _buildInfoRow(Icons.check_circle, 'Điểm đạt', '${config.passingScore}%'),
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

  Widget _buildQuizView(QuizState state) {
    final question = state.currentQuestion;
    if (question == null) return const SizedBox.shrink();

    final currentAnswer = state.answers[question.id];

    return Column(
      children: [
        // Progress bar
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
                // Question header
                Row(
                  children: [
                    _buildDifficultyBadge(question.difficulty),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.shade200),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.stars, size: 16, color: Colors.amber),
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

                // Question text
                Text(
                  question.question,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),

                // Answer options
                _buildQuestionWidget(question, currentAnswer),
              ],
            ),
          ),
        ),

        // Navigation buttons
        _buildNavigationButtons(state),
      ],
    );
  }

  Widget _buildDifficultyBadge(String difficulty) {
    Color color;
    String label;

    switch (difficulty.toLowerCase()) {
      case 'easy':
        color = Colors.green;
        label = 'Dễ';
        break;
      case 'hard':
        color = Colors.red;
        label = 'Khó';
        break;
      default:
        color = Colors.orange;
        label = 'Trung bình';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
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

  Widget _buildNavigationButtons(QuizState state) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          if (state.hasPrevious)
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  ref.read(quizProvider.notifier).previousQuestion();
                },
                icon: const Icon(Icons.arrow_back),
                label: const Text('Trước'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
          if (state.hasPrevious) const SizedBox(width: 16),
          Expanded(
            flex: state.hasPrevious ? 1 : 2,
            child: ElevatedButton.icon(
              onPressed: () {
                if (state.isLastQuestion) {
                  _showSubmitConfirmation();
                } else {
                  ref.read(quizProvider.notifier).nextQuestion();
                }
              },
              icon: Icon(state.isLastQuestion ? Icons.check : Icons.arrow_forward),
              label: Text(state.isLastQuestion ? 'Nộp bài' : 'Tiếp'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
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
            Text('Bạn đã trả lời ${state.answeredCount}/${state.totalQuestions} câu hỏi.'),
            if (unanswered > 0)
              Text(
                '\nCòn $unanswered câu chưa trả lời.',
                style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold),
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
