import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// Widget for displaying book icons with gradient backgrounds
/// Shows cover image if available, otherwise displays first letter with gradient
class BookIcon extends StatelessWidget {
  const BookIcon({
    required this.initial,
    required this.gradientColors,
    this.coverImage,
    super.key,
  });

  final String initial;
  final List<Color> gradientColors;
  final String? coverImage;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 90,
      height: 120,
      margin: const EdgeInsets.only(right: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(3),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: coverImage != null
              ? CachedNetworkImage(
                  imageUrl: coverImage!,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    color: Colors.black.withOpacity(0.3),
                    child: const Center(
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    ),
                  ),
                  errorWidget: (context, url, error) => _buildInitialFallback(),
                )
              : _buildInitialFallback(),
        ),
      ),
    );
  }

  Widget _buildInitialFallback() {
    return Container(
      color: Colors.black.withOpacity(0.3),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            fontSize: 48,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}
