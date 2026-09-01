import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../../shared/theme/app_colors.dart';
import '../../domain/entities/video.dart';

const double _kThumbWidth = 72;
const double _kThumbHeight = 42;

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
        leading: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 20,
              child: Text(
                '${lesson.order}',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isActive
                      ? AppColors.primaryGold
                      : AppColors.textSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: lesson.thumbnailUrl != null
                  ? CachedNetworkImage(
                      imageUrl: lesson.thumbnailUrl!,
                      width: _kThumbWidth,
                      height: _kThumbHeight,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => const _ThumbPlaceholder(),
                      errorWidget: (_, __, ___) => const _ThumbPlaceholder(),
                    )
                  : const _ThumbPlaceholder(),
            ),
          ],
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

/// Same-size empty state for a missing/failed thumbnail — matches web's
/// LessonListTab.vue `.lesson-list__thumb--empty` (never blank/broken).
class _ThumbPlaceholder extends StatelessWidget {
  const _ThumbPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _kThumbWidth,
      height: _kThumbHeight,
      color: AppColors.surfaceAlt,
      alignment: Alignment.center,
      child: const Icon(
        Icons.smart_display_outlined,
        color: AppColors.textSecondary,
        size: 20,
      ),
    );
  }
}
