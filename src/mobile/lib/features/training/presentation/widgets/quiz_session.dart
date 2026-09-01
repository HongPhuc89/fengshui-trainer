import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../bloc/quiz_bloc.dart';
import '../bloc/training_bloc.dart';
import '../../domain/entities/training.dart';

class QuizSession extends StatelessWidget {
  final String activityId;

  const QuizSession({super.key, required this.activityId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          getIt<QuizBloc>()..add(LoadExam(activityId)),
      child: const _QuizSessionView(),
    );
  }
}

class _QuizSessionView extends StatelessWidget {
  const _QuizSessionView();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<QuizBloc, QuizState>(
      builder: (context, state) {
        if (state is QuizLoading) {
          return const Center(
              child: CircularProgressIndicator(
                  color: AppColors.primaryGold));
        }

        if (state is QuizError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(state.message,
                    style: const TextStyle(
                        color: AppColors.textSecondary)),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () =>
                      context.read<TrainingBloc>().add(const BackToSelector()),
                  child: const Text('Quay lại'),
                ),
              ],
            ),
          );
        }

        if (state is QuizCompleted) {
          return _ScoreScreen(
            state: state,
            onRestart: () =>
                context.read<QuizBloc>().add(const RestartQuiz()),
            onBack: () =>
                context.read<TrainingBloc>().add(const BackToSelector()),
          );
        }

        if (state is QuizInProgress) {
          return _QuestionView(state: state);
        }

        return const SizedBox.shrink();
      },
    );
  }
}

class _QuestionView extends StatelessWidget {
  final QuizInProgress state;

  const _QuestionView({required this.state});

  @override
  Widget build(BuildContext context) {
    final q = state.currentQuestion;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context
                    .read<TrainingBloc>()
                    .add(const BackToSelector()),
              ),
              Expanded(
                child: LinearProgressIndicator(
                  value: (state.currentIndex + 1) /
                      state.exam.questions.length,
                  backgroundColor: AppColors.surfaceAlt,
                  valueColor: const AlwaysStoppedAnimation(
                      AppColors.primaryGold),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${state.currentIndex + 1}/${state.exam.questions.length}',
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
        ),

        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    q.text,
                    style: const TextStyle(
                      fontSize: 16,
                      color: AppColors.textPrimary,
                      height: 1.5,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Choices
                ...q.choices.map((choice) => _ChoiceTile(
                      choice: choice,
                      isSelected:
                          state.currentAnswer == choice.id,
                      isCorrect: choice.id == q.correctChoiceId,
                      hasAnswered: state.isAnswered,
                      onTap: state.isAnswered
                          ? null
                          : () => context
                              .read<QuizBloc>()
                              .add(AnswerQuestion(choice.id)),
                    )),

                // Explanation
                if (state.isAnswered && q.explanation != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceAlt,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Giải thích: ${q.explanation}',
                      style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                          height: 1.4),
                    ),
                  ),
                ],

                if (state.isAnswered) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context
                          .read<QuizBloc>()
                          .add(const AdvanceQuestion()),
                      child: Text(
                        state.currentIndex + 1 <
                                state.exam.questions.length
                            ? 'Câu tiếp theo'
                            : 'Xem kết quả',
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ChoiceTile extends StatelessWidget {
  final QuizChoice choice;
  final bool isSelected;
  final bool isCorrect;
  final bool hasAnswered;
  final VoidCallback? onTap;

  const _ChoiceTile({
    required this.choice,
    required this.isSelected,
    required this.isCorrect,
    required this.hasAnswered,
    this.onTap,
  });

  Color _bgColor() {
    if (!hasAnswered) {
      return isSelected
          ? AppColors.primaryGold.withOpacity(0.15)
          : AppColors.surface;
    }
    if (isCorrect) return Colors.green.withOpacity(0.15);
    if (isSelected && !isCorrect)
      return AppColors.error.withOpacity(0.15);
    return AppColors.surface;
  }

  Color _borderColor() {
    if (!hasAnswered) {
      return isSelected
          ? AppColors.primaryGold
          : AppColors.surfaceAlt;
    }
    if (isCorrect) return Colors.green;
    if (isSelected && !isCorrect) return AppColors.error;
    return AppColors.surfaceAlt;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 10),
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: _bgColor(),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: _borderColor()),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                choice.text,
                style: const TextStyle(
                    color: AppColors.textPrimary, fontSize: 14),
              ),
            ),
            if (hasAnswered && isCorrect)
              const Icon(Icons.check_circle, color: Colors.green),
            if (hasAnswered && isSelected && !isCorrect)
              const Icon(Icons.cancel, color: AppColors.error),
          ],
        ),
      ),
    );
  }
}

class _ScoreScreen extends StatelessWidget {
  final QuizCompleted state;
  final VoidCallback onRestart;
  final VoidCallback onBack;

  const _ScoreScreen({
    required this.state,
    required this.onRestart,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    final scorePercent = (state.score * 100).round();
    final color = scorePercent >= 70 ? Colors.green : AppColors.error;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              value: state.score,
              backgroundColor: AppColors.surfaceAlt,
              valueColor: AlwaysStoppedAnimation(color),
              strokeWidth: 8,
            ),
            const SizedBox(height: 24),
            Text(
              '$scorePercent%',
              style: TextStyle(
                fontSize: 40,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '${state.correctCount}/${state.totalCount} câu đúng',
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 16),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onRestart,
                child: const Text('Làm lại'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onBack,
                child: const Text('Quay lại'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
