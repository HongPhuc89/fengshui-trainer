import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../../domain/entities/training.dart';
import '../bloc/training_bloc.dart';
import '../widgets/flashcard_session.dart';
import '../widgets/quiz_session.dart';
import '../widgets/training_mode_selector.dart';

class TrainingScreen extends StatelessWidget {
  final String? lessonSlug;
  final String? bookSlug;
  final int? chapterOrder;

  const TrainingScreen({
    super.key,
    this.lessonSlug,
    this.bookSlug,
    this.chapterOrder,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        final bloc = getIt<TrainingBloc>();
        if (lessonSlug != null) {
          bloc.add(LoadTrainingByLesson(lessonSlug!));
        } else if (bookSlug != null && chapterOrder != null) {
          bloc.add(LoadTrainingByChapter(bookSlug!, chapterOrder!));
        }
        return bloc;
      },
      child: const _TrainingView(),
    );
  }
}

class _TrainingView extends StatelessWidget {
  const _TrainingView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Luyện tập'),
      ),
      body: BlocBuilder<TrainingBloc, TrainingState>(
        builder: (context, state) {
          if (state is TrainingLoading) {
            return const Center(
                child: CircularProgressIndicator(
                    color: AppColors.primaryGold));
          }

          if (state is TrainingError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline,
                      color: AppColors.error, size: 48),
                  const SizedBox(height: 12),
                  Text(state.message,
                      style: const TextStyle(
                          color: AppColors.textSecondary)),
                ],
              ),
            );
          }

          if (state is TrainingLoaded) {
            // Show activity selector
            if (state.selectedActivity == null) {
              if (state.trainingSet.activities.isEmpty) {
                return const Center(
                  child: Text(
                    'Không có hoạt động luyện tập nào',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                );
              }
              return TrainingModeSelector(
                  activities: state.trainingSet.activities);
            }

            // Show selected activity
            final activity = state.selectedActivity!;
            if (activity.type == ActivityType.flashcard) {
              return FlashcardSession(activityId: activity.id);
            } else {
              return QuizSession(activityId: activity.id);
            }
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }
}
