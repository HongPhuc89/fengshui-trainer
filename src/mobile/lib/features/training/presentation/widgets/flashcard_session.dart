import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../bloc/flashcard_bloc.dart';
import '../bloc/training_bloc.dart';

class FlashcardSession extends StatelessWidget {
  final String activityId;

  const FlashcardSession({super.key, required this.activityId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          getIt<FlashcardBloc>()..add(LoadFlashcards(activityId)),
      child: const _FlashcardSessionView(),
    );
  }
}

class _FlashcardSessionView extends StatelessWidget {
  const _FlashcardSessionView();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<FlashcardBloc, FlashcardState>(
      builder: (context, state) {
        if (state is FlashcardLoading) {
          return const Center(
              child: CircularProgressIndicator(
                  color: AppColors.primaryGold));
        }

        if (state is FlashcardError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(state.message,
                    style: const TextStyle(
                        color: AppColors.textSecondary)),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () =>
                      context.read<TrainingBloc>().add(const BackToSelector()),
                  child: const Text('Quay lại'),
                ),
              ],
            ),
          );
        }

        if (state is FlashcardCompleted) {
          return _CompletionScreen(
            totalCards: state.totalCards,
            onNewSet: () =>
                context.read<FlashcardBloc>().add(const RestartSession()),
            onBack: () =>
                context.read<TrainingBloc>().add(const BackToSelector()),
          );
        }

        if (state is FlashcardInProgress) {
          return Column(
            children: [
              // Progress indicator
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () => context
                          .read<TrainingBloc>()
                          .add(const BackToSelector()),
                    ),
                    Expanded(
                      child: LinearProgressIndicator(
                        value: (state.currentIndex + 1) / state.total,
                        backgroundColor: AppColors.surfaceAlt,
                        valueColor: const AlwaysStoppedAnimation(
                            AppColors.primaryGold),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${state.currentIndex + 1}/${state.total}',
                      style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13),
                    ),
                  ],
                ),
              ),

              // Flashcard
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: FlashcardWidget(
                    front: state.currentCard.front,
                    back: state.currentCard.back,
                    isFlipped: state.isFlipped,
                    onTap: () => context
                        .read<FlashcardBloc>()
                        .add(const FlipCard()),
                  ),
                ),
              ),

              // Navigation buttons
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    OutlinedButton.icon(
                      icon: const Icon(Icons.chevron_left),
                      label: const Text('Trước'),
                      onPressed: state.currentIndex > 0
                          ? () => context
                              .read<FlashcardBloc>()
                              .add(const PreviousCard())
                          : null,
                    ),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.chevron_right),
                      label: const Text('Tiếp'),
                      onPressed: () => context
                          .read<FlashcardBloc>()
                          .add(const NextCard()),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
          );
        }

        return const SizedBox.shrink();
      },
    );
  }
}

class FlashcardWidget extends StatefulWidget {
  final String front;
  final String back;
  final bool isFlipped;
  final VoidCallback onTap;

  const FlashcardWidget({
    super.key,
    required this.front,
    required this.back,
    required this.isFlipped,
    required this.onTap,
  });

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
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _animation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void didUpdateWidget(FlashcardWidget old) {
    super.didUpdateWidget(old);
    if (widget.isFlipped != old.isFlipped) {
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
        builder: (_, __) {
          final angle = _animation.value * pi;
          final showFront = angle < pi / 2;
          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(angle),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: AppColors.primaryGold.withOpacity(0.3)),
              ),
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        showFront ? 'Mặt trước' : 'Mặt sau',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Transform(
                        alignment: Alignment.center,
                        transform: showFront
                            ? Matrix4.identity()
                            : Matrix4.identity()..rotateY(pi),
                        child: Text(
                          showFront ? widget.front : widget.back,
                          style: const TextStyle(
                            fontSize: 18,
                            color: AppColors.textPrimary,
                            height: 1.5,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Nhấn để lật thẻ',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary
                              .withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _CompletionScreen extends StatelessWidget {
  final int totalCards;
  final VoidCallback onNewSet;
  final VoidCallback onBack;

  const _CompletionScreen({
    required this.totalCards,
    required this.onNewSet,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.celebration,
                color: AppColors.primaryGold, size: 64),
            const SizedBox(height: 24),
            const Text(
              'Hoàn thành!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Bạn đã xem qua $totalCards thẻ',
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onNewSet,
                child: const Text('Lấy bộ mới ngẫu nhiên'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onBack,
                child: const Text('Quay lại'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
