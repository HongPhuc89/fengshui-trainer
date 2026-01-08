import 'package:flutter/material.dart';
import 'book_icon.dart';
import 'book_info.dart';

/// Animated book card widget that combines BookIcon and BookInfo
/// Features staggered entrance animation and press animation
class BookCard extends StatefulWidget {
  const BookCard({
    required this.title,
    required this.category,
    required this.description,
    required this.chapterCount,
    required this.initial,
    required this.gradientColors,
    required this.onPress,
    required this.index,
    this.coverImage,
    super.key,
  });

  final String title;
  final String category;
  final String description;
  final int chapterCount;
  final String initial;
  final List<Color> gradientColors;
  final String? coverImage;
  final VoidCallback onPress;
  final int index;

  @override
  State<BookCard> createState() => _BookCardState();
}

class _BookCardState extends State<BookCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    // Staggered entrance animation
    final delay = widget.index * 100;
    _controller.forward(from: delay / 600);

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _slideAnimation = Tween<double>(begin: 50.0, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _scaleAnimation = Tween<double>(begin: 0.95, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: _fadeAnimation.value,
          child: Transform.translate(
            offset: Offset(0, _slideAnimation.value),
            child: Transform.scale(
              scale: _scaleAnimation.value,
              child: child,
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: widget.onPress,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.white.withOpacity(0.05),
                    Colors.white.withOpacity(0.02),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Colors.white.withOpacity(0.1),
                  width: 1,
                ),
              ),
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  BookIcon(
                    initial: widget.initial,
                    gradientColors: widget.gradientColors,
                    coverImage: widget.coverImage,
                  ),
                  BookInfo(
                    title: widget.title,
                    category: widget.category,
                    description: widget.description,
                    chapterCount: widget.chapterCount,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
