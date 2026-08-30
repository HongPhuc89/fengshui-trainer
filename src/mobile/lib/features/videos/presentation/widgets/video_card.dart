import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../../shared/theme/app_colors.dart';
import '../../domain/entities/video.dart';

class VideoCard extends StatelessWidget {
  final Video video;
  final VoidCallback? onTap;

  const VideoCard({super.key, required this.video, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Thumbnail
              video.thumbnailUrl != null
                  ? CachedNetworkImage(
                      imageUrl: video.thumbnailUrl!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) =>
                          Container(color: AppColors.surface),
                      errorWidget: (_, __, ___) => _placeholder(),
                    )
                  : _placeholder(),

              // Play icon overlay
              const Center(
                child: CircleAvatar(
                  backgroundColor: Colors.black45,
                  radius: 22,
                  child: Icon(Icons.play_arrow,
                      color: Colors.white, size: 28),
                ),
              ),

              // Progress bar
              if (video.progressPercent != null &&
                  video.progressPercent! > 0)
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(
                    value: (video.progressPercent! / 100).clamp(0.0, 1.0),
                    backgroundColor: Colors.black45,
                    valueColor: const AlwaysStoppedAnimation(
                        AppColors.primaryGold),
                    minHeight: 3,
                  ),
                ),

              // "MỚI" badge
              if (video.isNewRelease)
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryGold,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'MỚI',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _placeholder() => Container(
        color: AppColors.surface,
        child: const Center(
          child: Icon(Icons.play_circle_outline,
              color: AppColors.textSecondary, size: 40),
        ),
      );
}
