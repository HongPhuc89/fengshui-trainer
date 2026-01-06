import 'package:flutter/material.dart';
import '../providers/quiz_provider.dart';

class QuizAppBar extends StatelessWidget implements PreferredSizeWidget {

  const QuizAppBar({
    required this.state, required this.formatTimeRemaining, super.key,
  });
  final QuizState state;
  final String Function() formatTimeRemaining;

  @override
  Widget build(BuildContext context) {
    if (state.attempt != null) {
      return AppBar(
        title: Text(
          'Câu ${state.currentQuestionIndex + 1}/${state.totalQuestions}',
        ),
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
                      formatTimeRemaining(),
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

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
