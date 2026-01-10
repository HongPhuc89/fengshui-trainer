import 'package:flutter/material.dart';

/// Quiz actions for confirming answer or submitting quiz
class QuizActions extends StatelessWidget {
  const QuizActions({
    required this.isLastQuestion,
    required this.isAnswered,
    required this.isSubmitted,
    required this.isSubmitting,
    required this.onConfirm,
    required this.onSubmit,
    super.key,
  });

  final bool isLastQuestion;
  final bool isAnswered;
  final bool isSubmitted;
  final bool isSubmitting;
  final VoidCallback onConfirm;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    if (isSubmitting) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    if (isLastQuestion && isSubmitted) {
      return _buildSubmitButton();
    }

    if (isSubmitted) {
      return const SizedBox.shrink(); // Hide button after submission
    }

    return _buildConfirmButton();
  }

  Widget _buildConfirmButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: isAnswered ? onConfirm : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF8b5cf6),
          disabledBackgroundColor: Colors.white.withOpacity(0.1),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
        ),
        child: Text(
          'Xác nhận đáp án',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isAnswered ? Colors.white : Colors.white.withOpacity(0.5),
          ),
        ),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: onSubmit,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF10b981),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, color: Colors.white),
            SizedBox(width: 8),
            Text(
              'Nộp bài',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
