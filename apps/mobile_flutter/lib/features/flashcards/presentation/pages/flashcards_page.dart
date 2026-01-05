import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/flashcards_provider.dart';
import '../widgets/flashcard_widget.dart';

class FlashcardsPage extends ConsumerStatefulWidget {
  final int bookId;
  final int chapterId;

  const FlashcardsPage({
    Key? key,
    required this.bookId,
    required this.chapterId,
  }) : super(key: key);

  @override
  ConsumerState<FlashcardsPage> createState() => _FlashcardsPageState();
}

class _FlashcardsPageState extends ConsumerState<FlashcardsPage> {
  @override
  void initState() {
    super.initState();
    // Load flashcards when page opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(flashcardsProvider.notifier).loadFlashcards(
            bookId: widget.bookId,
            chapterId: widget.chapterId,
            count: 20,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(flashcardsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Flashcards'),
        actions: [
          if (state.flashcards.isNotEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Text(
                  '${state.currentIndex + 1}/${state.totalCards}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(FlashcardsState state) {
    if (state.isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (state.error != null) {
      return _buildError(state.error!);
    }

    if (state.flashcards.isEmpty) {
      return const Center(
        child: Text(
          'Chương này chưa có flashcards',
          style: TextStyle(fontSize: 16, color: Colors.grey),
        ),
      );
    }

    if (state.isCompleted) {
      return _buildCompletionScreen(state);
    }

    return _buildFlashcardView(state);
  }

  Widget _buildError(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              error,
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                ref.read(flashcardsProvider.notifier).loadFlashcards(
                      bookId: widget.bookId,
                      chapterId: widget.chapterId,
                      count: 20,
                    );
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFlashcardView(FlashcardsState state) {
    final flashcard = state.currentFlashcard;
    final progress = state.currentProgress;

    if (flashcard == null) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        // Progress indicator
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              LinearProgressIndicator(
                value: (state.currentIndex + 1) / state.totalCards,
                backgroundColor: Colors.grey.shade200,
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.blue),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Đã xem: ${state.reviewedCount}/${state.totalCards}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  Text(
                    'Đúng: ${state.correctCount}',
                    style:
                        TextStyle(fontSize: 12, color: Colors.green.shade600),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Flashcard
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Center(
              child: Dismissible(
                key: ValueKey(flashcard.id),
                onDismissed: (direction) {
                  if (direction == DismissDirection.endToStart) {
                    // Swipe left = incorrect
                    ref.read(flashcardsProvider.notifier).answerIncorrect();
                  } else if (direction == DismissDirection.startToEnd) {
                    // Swipe right = correct
                    ref.read(flashcardsProvider.notifier).answerCorrect();
                  }
                },
                background: _buildSwipeBackground(
                  alignment: Alignment.centerLeft,
                  color: Colors.green,
                  icon: Icons.check,
                  label: 'Đúng',
                ),
                secondaryBackground: _buildSwipeBackground(
                  alignment: Alignment.centerRight,
                  color: Colors.red,
                  icon: Icons.close,
                  label: 'Sai',
                ),
                child: FlashcardWidget(
                  flashcard: flashcard,
                  progress: progress,
                  isFlipped: state.isFlipped,
                  onTap: () {
                    ref.read(flashcardsProvider.notifier).flipCard();
                  },
                ),
              ),
            ),
          ),
        ),

        // Action buttons
        Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    ref.read(flashcardsProvider.notifier).answerIncorrect();
                  },
                  icon: const Icon(Icons.close),
                  label: const Text('Sai'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    ref.read(flashcardsProvider.notifier).answerCorrect();
                  },
                  icon: const Icon(Icons.check),
                  label: const Text('Đúng'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSwipeBackground({
    required Alignment alignment,
    required Color color,
    required IconData icon,
    required String label,
  }) {
    return Container(
      alignment: alignment,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 48, color: color),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompletionScreen(FlashcardsState state) {
    final accuracy = state.totalCards > 0
        ? (state.correctCount / state.totalCards * 100).toStringAsFixed(1)
        : '0.0';

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.celebration,
              size: 80,
              color: Colors.amber,
            ),
            const SizedBox(height: 24),
            const Text(
              'Hoàn thành!',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Bạn đã xem hết ${state.totalCards} flashcards',
              style: const TextStyle(fontSize: 16, color: Colors.grey),
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStat('Tổng số', '${state.totalCards}', Colors.blue),
                      _buildStat('Đúng', '${state.correctCount}', Colors.green),
                      _buildStat('Độ chính xác', '$accuracy%', Colors.orange),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      ref.read(flashcardsProvider.notifier).resetSession();
                    },
                    icon: const Icon(Icons.replay),
                    label: const Text('Xem lại'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.arrow_back),
                    label: const Text('Quay lại'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }
}
