import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../shared/theme/app_colors.dart';
import '../../domain/entities/training.dart';
import '../bloc/training_bloc.dart';

class TrainingModeSelector extends StatelessWidget {
  final List<TrainingActivity> activities;

  const TrainingModeSelector({super.key, required this.activities});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.1,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: activities.length,
      itemBuilder: (_, i) {
        final activity = activities[i];
        return _ActivityCard(activity: activity);
      },
    );
  }
}

class _ActivityCard extends StatelessWidget {
  final TrainingActivity activity;

  const _ActivityCard({required this.activity});

  bool get _isFlashcard => activity.type == ActivityType.flashcard;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () =>
          context.read<TrainingBloc>().add(SelectActivity(activity)),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.primaryGold.withOpacity(0.3),
          ),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _isFlashcard
                  ? Icons.style_outlined
                  : Icons.quiz_outlined,
              color: AppColors.primaryGold,
              size: 40,
            ),
            const SizedBox(height: 12),
            Text(
              _isFlashcard ? 'Flashcard' : 'Quiz',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${activity.totalCount} ${_isFlashcard ? 'thẻ' : 'câu'}',
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
