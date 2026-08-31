import 'package:flutter/material.dart';

import '../../../../../shared/theme/app_colors.dart';
import '../../domain/entities/video.dart';

/// One row in a course's lesson list — shared by the course detail screen
/// (browsing before playback) and the player screen's sidebar (switching
/// between lessons while one is already playing, where [isActive] highlights
/// whichever one that is).
class LessonListItem extends StatelessWidget {
  final LessonMeta lesson;
  final VoidCallback onTap;
  final bool isActive;
  final VoidCallback? onLocked;

  const LessonListItem({
    super.key,
    required this.lesson,
    required this.onTap,
    this.isActive = false,
    this.onLocked,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: isActive ? AppColors.primaryGold.withOpacity(0.08) : null,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 2),
        leading: CircleAvatar(
          backgroundColor: AppColors.surfaceAlt,
          child: Text(
            '${lesson.order}',
            style: const TextStyle(color: AppColors.primaryGold, fontSize: 13),
          ),
        ),
        title: Text(
          lesson.title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: isActive ? AppColors.primaryGold : AppColors.textPrimary,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
            fontSize: 14,
          ),
        ),
        subtitle: Text(
          lesson.durationLabel,
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
        ),
        trailing: lesson.canAccess
            ? (lesson.isCompleted
                  ? const Icon(Icons.check_circle, color: AppColors.success)
                  : const Icon(
                      Icons.play_circle_outline,
                      color: AppColors.primaryGold,
                    ))
            : const Icon(Icons.lock_outline, color: AppColors.lockGray),
        onTap: lesson.canAccess ? onTap : onLocked,
      ),
    );
  }
}
