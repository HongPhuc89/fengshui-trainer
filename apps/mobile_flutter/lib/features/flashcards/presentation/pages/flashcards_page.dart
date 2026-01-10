import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/flashcards_provider.dart';

class FlashcardsPage extends ConsumerStatefulWidget {
  const FlashcardsPage({
    required this.bookId,
    required this.chapterId,
    super.key,
  });
  
  final int bookId;
  final int chapterId;

  @override
  ConsumerState<FlashcardsPage> createState() => _FlashcardsPageState();
}

class _FlashcardsPageState extends ConsumerState<FlashcardsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(flashcardsProvider.notifier).loadFlashcards(
            bookId: widget.bookId,
            chapterId: widget.chapterId,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(flashcardsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF1a1a2e),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF2D3E50),
              Color(0xFF1a1a2e),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // App Bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => context.go('/books/${widget.bookId}/chapters/${widget.chapterId}'),
                    ),
                    const Expanded(
                      child: Text(
                        'Thẻ Nhớ',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    if (state.flashcards.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF4A5568),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${state.currentIndex + 1}/${state.totalCards}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFFFA500),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              
              // Progress Bar
              if (state.flashcards.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (state.currentIndex + 1) / state.totalCards,
                      backgroundColor: const Color(0xFF4A5568),
                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFFA500)),
                      minHeight: 6,
                    ),
                  ),
                ),
              
              // Content
              Expanded(
                child: _buildBody(state),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody(FlashcardsState state) {
    if (state.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFFFFA500)),
      );
    }

    if (state.error != null) {
      return _buildError(state.error!);
    }

    if (state.flashcards.isEmpty) {
      return const Center(
        child: Text(
          'Chương này chưa có flashcards',
          style: TextStyle(fontSize: 16, color: Colors.white60),
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
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              error,
              style: const TextStyle(fontSize: 16, color: Colors.white),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                ref.read(flashcardsProvider.notifier).loadFlashcards(
                      bookId: widget.bookId,
                      chapterId: widget.chapterId,
                    );
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Thử lại'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFFA500),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFlashcardView(FlashcardsState state) {
    final flashcard = state.currentFlashcard;
    if (flashcard == null) return const SizedBox.shrink();

    return Column(
      children: [
        const SizedBox(height: 24),
        
        // Flashcard
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: GestureDetector(
              onTap: () => ref.read(flashcardsProvider.notifier).flipCard(),
              onHorizontalDragEnd: (details) {
                // Swipe right = previous card
                if (details.primaryVelocity! > 0) {
                  if (state.currentIndex > 0) {
                    ref.read(flashcardsProvider.notifier).previousCard();
                  }
                }
                // Swipe left = next card
                else if (details.primaryVelocity! < 0) {
                  if (state.currentIndex < state.totalCards - 1) {
                    ref.read(flashcardsProvider.notifier).nextCard();
                  }
                }
              },
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF8B5CF6),
                      Color(0xFF7C3AED),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF8B5CF6).withOpacity(0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Icon and label
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.help_outline,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            state.isFlipped ? 'CÂU TRẢ LỜI' : 'CÂU HỎI',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                      
                      // Question/Answer text
                      Expanded(
                        child: Center(
                          child: Text(
                            state.isFlipped ? flashcard.answer : flashcard.question,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                              height: 1.4,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                      
                      // Tap hint
                      if (!state.isFlipped)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.touch_app,
                              color: Colors.white.withOpacity(0.7),
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Chạm để lật thẻ',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.white.withOpacity(0.7),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        
        // Bottom buttons
        Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            children: [
              // Previous button
              IconButton(
                onPressed: state.currentIndex > 0
                    ? () => ref.read(flashcardsProvider.notifier).previousCard()
                    : null,
                icon: const Icon(Icons.chevron_left, size: 32),
                color: Colors.white,
                disabledColor: Colors.white24,
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFF4A5568),
                  shape: const CircleBorder(),
                  padding: const EdgeInsets.all(12),
                ),
              ),
              const SizedBox(width: 16),
              
              // Flip button
              Expanded(
                child: ElevatedButton(
                  onPressed: () => ref.read(flashcardsProvider.notifier).flipCard(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFFA500),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.flip, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        state.isFlipped ? 'Xem câu hỏi' : 'Lật thẻ',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 16),
              
              // Next button
              IconButton(
                onPressed: state.currentIndex < state.totalCards - 1
                    ? () => ref.read(flashcardsProvider.notifier).nextCard()
                    : null,
                icon: const Icon(Icons.chevron_right, size: 32),
                color: Colors.white,
                disabledColor: Colors.white24,
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFF4A5568),
                  shape: const CircleBorder(),
                  padding: const EdgeInsets.all(12),
                ),
              ),
            ],
          ),
        ),
      ],
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
            const Icon(Icons.celebration, size: 80, color: Color(0xFFFFA500)),
            const SizedBox(height: 24),
            const Text(
              'Hoàn thành!',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Bạn đã xem hết ${state.totalCards} flashcards',
              style: const TextStyle(fontSize: 16, color: Colors.white60),
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStat('Tổng số', '${state.totalCards}', const Color(0xFF3B82F6)),
                  _buildStat('Đúng', '${state.correctCount}', const Color(0xFF10B981)),
                  _buildStat('Độ chính xác', '$accuracy%', const Color(0xFFFFA500)),
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
                    icon: const Icon(Icons.replay, color: Colors.white),
                    label: const Text('Xem lại', style: TextStyle(color: Colors.white)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: Colors.white24),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => context.go('/books/${widget.bookId}/chapters/${widget.chapterId}'),
                    icon: const Icon(Icons.arrow_back),
                    label: const Text('Quay lại'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFFA500),
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
            color: Colors.white60,
          ),
        ),
      ],
    );
  }
}
