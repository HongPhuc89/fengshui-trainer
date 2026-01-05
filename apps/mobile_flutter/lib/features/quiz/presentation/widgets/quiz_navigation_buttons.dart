import 'package:flutter/material.dart';
import '../providers/quiz_provider.dart';

class QuizNavigationButtons extends StatelessWidget {
  final QuizState state;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onSubmit;

  const QuizNavigationButtons({
    super.key,
    required this.state,
    required this.onPrevious,
    required this.onNext,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
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
                onPressed: onPrevious,
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
              onPressed: state.isLastQuestion ? onSubmit : onNext,
              icon: Icon(
                state.isLastQuestion ? Icons.check : Icons.arrow_forward,
              ),
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
}
