import 'dart:math';
import 'package:flutter/material.dart';
import '../../data/models/flashcard_models.dart';

class FlashcardWidget extends StatefulWidget {
  final Flashcard flashcard;
  final FlashcardProgress? progress;
  final bool isFlipped;
  final VoidCallback onTap;

  const FlashcardWidget({
    Key? key,
    required this.flashcard,
    this.progress,
    required this.isFlipped,
    required this.onTap,
  }) : super(key: key);

  @override
  State<FlashcardWidget> createState() => _FlashcardWidgetState();
}

class _FlashcardWidgetState extends State<FlashcardWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _animation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void didUpdateWidget(FlashcardWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isFlipped != oldWidget.isFlipped) {
      if (widget.isFlipped) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _animation,
        builder: (context, child) {
          final angle = _animation.value * pi;
          final isBack = angle > pi / 2;

          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(angle),
            child: isBack
                ? Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()..rotateY(pi),
                    child: _buildCardBack(),
                  )
                : _buildCardFront(),
          );
        },
      ),
    );
  }

  Widget _buildCardFront() {
    return _buildCard(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.help_outline,
            size: 48,
            color: Colors.blue,
          ),
          const SizedBox(height: 24),
          Text(
            widget.flashcard.question,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          const Text(
            'Nhấn để xem câu trả lời',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardBack() {
    return _buildCard(
      child: SingleChildScrollView(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.check_circle_outline,
              size: 48,
              color: Colors.green,
            ),
            const SizedBox(height: 24),
            Text(
              widget.flashcard.answer,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            if (widget.flashcard.hint != null) ...[
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.lightbulb_outline,
                        color: Colors.amber.shade700, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.flashcard.hint!,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.amber.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      width: double.infinity,
      height: 400,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildDifficultyBadge(),
              _buildMasteryIndicator(),
            ],
          ),
          const SizedBox(height: 24),
          Expanded(child: Center(child: child)),
        ],
      ),
    );
  }

  Widget _buildDifficultyBadge() {
    final difficulty = widget.flashcard.difficulty ?? 'medium';
    Color color;
    String label;

    switch (difficulty.toLowerCase()) {
      case 'easy':
        color = Colors.green;
        label = 'Dễ';
        break;
      case 'hard':
        color = Colors.red;
        label = 'Khó';
        break;
      default:
        color = Colors.orange;
        label = 'Trung bình';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _buildMasteryIndicator() {
    final masteryLevel = widget.progress?.masteryLevel ?? 0;

    return Row(
      children: List.generate(5, (index) {
        return Icon(
          index < masteryLevel ? Icons.star : Icons.star_border,
          size: 20,
          color: Colors.amber,
        );
      }),
    );
  }
}
